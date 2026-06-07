/**
 * Script injecté dans Gmail — détection des expéditeurs et appel API BLOCKTRUST.
 * API alignée avec GET /api/extension/verify-sender
 * Scan uniquement sur l’email ouvert + cache local + queue anti rate-limit.
 */

const API_BASE = "https://blocktrust.tech";

/** Cache résultats pour éviter re-appels (5 min). */
const verifyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/** Queue séquentielle avec délai entre requêtes API. */
const scanQueue = [];
let isProcessing = false;

/** Sélecteurs expéditeur dans le message ouvert */
const SENDER_SELECTORS = [
  ".gD[email]",
  "[email].go",
  '[data-hovercard-id*="@"]',
  ".yP[email]",
  ".zF[email]",
];

console.log("[BLOCKTRUST] Content script chargé sur Gmail");
console.log("[BLOCKTRUST] API_BASE:", API_BASE);

chrome.storage.local.get(["apiKey"], (data) => {
  console.log("[BLOCKTRUST] Clé API:", data.apiKey ? "présente" : "absente");
});

/**
 * Styles globaux dans le head Gmail (résiste aux overrides Gmail).
 */
function injectGlobalStyles() {
  if (document.getElementById("blocktrust-styles")) return;

  const style = document.createElement("style");
  style.id = "blocktrust-styles";
  style.textContent = `
    .bt-trust-badge {
      display: inline-flex !important;
      align-items: center !important;
      padding: 2px 8px !important;
      border-radius: 10px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      margin-left: 8px !important;
      font-family: Inter, Arial, sans-serif !important;
      vertical-align: middle !important;
      white-space: nowrap !important;
      cursor: default !important;
      z-index: 9999 !important;
      position: relative !important;
      line-height: 1.4 !important;
      letter-spacing: 0 !important;
      text-decoration: none !important;
      border: none !important;
      box-sizing: border-box !important;
    }
    .bt-certified {
      background: #10b981 !important;
      color: #ffffff !important;
    }
    .bt-contacts {
      background: #0ea5e9 !important;
      color: #ffffff !important;
    }
    .bt-fraud {
      background: #ef4444 !important;
      color: #ffffff !important;
    }
    .bt-unknown {
      background: rgba(100, 116, 139, 0.15) !important;
      border: 1px solid rgba(100, 116, 139, 0.3) !important;
      color: #94a3b8 !important;
    }
    .bt-tooltip {
      position: fixed !important;
      z-index: 2147483646 !important;
      min-width: 200px !important;
      padding: 10px 12px !important;
      border-radius: 10px !important;
      background: #0a1628 !important;
      border: 1px solid rgba(0, 212, 255, 0.35) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 11px !important;
      color: #ffffff !important;
      pointer-events: none !important;
      opacity: 0 !important;
      transform: translateY(4px) !important;
      transition: opacity 0.15s ease, transform 0.15s ease !important;
    }
    .bt-tooltip.bt-tooltip-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
    .bt-tooltip-title {
      display: block !important;
      margin-bottom: 8px !important;
      font-weight: 700 !important;
      font-size: 10px !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      color: #00d4ff !important;
    }
    .bt-tooltip-row {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      margin-top: 5px !important;
      line-height: 1.3 !important;
    }
    .bt-tooltip-ok {
      color: #10b981 !important;
      font-weight: 700 !important;
    }
    .bt-tooltip-ko {
      color: #64748b !important;
    }
    .bt-tooltip-link {
      display: inline-block !important;
      margin-top: 8px !important;
      color: #00d4ff !important;
      font-weight: 600 !important;
      text-decoration: none !important;
    }
    .bt-tooltip-muted {
      color: rgba(255, 255, 255, 0.55) !important;
      line-height: 1.45 !important;
    }
    .bt-tooltip-highlight {
      color: #00d4ff !important;
    }
  `;

  const target = document.head || document.documentElement;
  target.appendChild(style);
}

/**
 * Récupère la clé API utilisateur (format bt_ext_...) depuis chrome.storage.local
 */
function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiKey"], (result) => {
      resolve(result.apiKey || null);
    });
  });
}

/**
 * Appelle l’API de vérification d’expéditeur (sans cache).
 * @param {string} email
 * @param {string} domain
 * @returns {Promise<object|null>}
 */
async function verifySender(email, domain) {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  try {
    const url = new URL(`${API_BASE}/api/extension/verify-sender`);
    url.searchParams.set("email", email);
    url.searchParams.set("domain", domain);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    console.log("[BLOCKTRUST] Status API:", response.status);
    console.log("[BLOCKTRUST] Data:", data);

    if (!response.ok) return null;

    return data;
  } catch (e) {
    console.warn("[BLOCKTRUST] verify-sender erreur:", e);
    return null;
  }
}

/**
 * Vérification avec cache local (clé = email).
 * @param {string} email
 * @param {string} domain
 */
async function verifySenderCached(email, domain) {
  const cacheKey = email.toLowerCase();
  const cached = verifyCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[BLOCKTRUST] Résultat API (cache):", cached.result);
    return cached.result;
  }

  const result = await verifySender(email, domain);

  if (result) {
    verifyCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  return result;
}

/**
 * Traite la queue une requête à la fois (300 ms entre chaque appel).
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (scanQueue.length > 0) {
    const { email, domain, element } = scanQueue.shift();

    const result = await verifySenderCached(email, domain);
    console.log("[BLOCKTRUST] Résultat API:", result);

    if (result) {
      const badge = createVerifyBadge(result);
      injectBadge(element, badge);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  isProcessing = false;
}

/**
 * Ajoute un expéditeur à la queue (ou injecte depuis le cache immédiatement).
 * @param {string} email
 * @param {string} domain
 * @param {Element} element
 */
function addToQueue(email, domain, element) {
  const emailKey = email.toLowerCase();

  const alreadyQueued = scanQueue.some((item) => item.email.toLowerCase() === emailKey);
  if (alreadyQueued) return;

  const cached = verifyCache.get(emailKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (cached.result) {
      const badge = createVerifyBadge(cached.result);
      injectBadge(element, badge);
    }
    return;
  }

  scanQueue.push({ email, domain, element });
  void processQueue();
}

/** Tooltip flottant unique (réutilisé entre badges). */
let activeTooltip = null;

/** Affiche ou masque la tooltip (inline !important — Gmail ignore les classes seules). */
function setTooltipVisible(tooltip, visible) {
  tooltip.style.setProperty("opacity", visible ? "1" : "0", "important");
  tooltip.style.setProperty(
    "transform",
    visible ? "translateY(0)" : "translateY(4px)",
    "important",
  );
}

function hideBadgeTooltip() {
  if (activeTooltip) {
    setTooltipVisible(activeTooltip, false);
  }
}

function positionTooltip(tooltip, anchor) {
  const rect = anchor.getBoundingClientRect();
  const top = rect.bottom + 8;
  let left = rect.left;
  const maxLeft = window.innerWidth - 220;
  if (left > maxLeft) left = maxLeft;
  tooltip.style.setProperty("top", `${top}px`, "important");
  tooltip.style.setProperty("left", `${left}px`, "important");
}

/** Styles inline — évite les classes CSS rejetées par Gmail (ex. bt-tooltip-interactive). */
function applyTooltipBaseStyles(tooltip, interactive) {
  tooltip.style.setProperty("position", "fixed", "important");
  tooltip.style.setProperty("z-index", "2147483646", "important");
  tooltip.style.setProperty("min-width", "200px", "important");
  tooltip.style.setProperty("padding", "10px 12px", "important");
  tooltip.style.setProperty("border-radius", "10px", "important");
  tooltip.style.setProperty("background", "#0a1628", "important");
  tooltip.style.setProperty("border", "1px solid rgba(0, 212, 255, 0.35)", "important");
  tooltip.style.setProperty("box-shadow", "0 8px 24px rgba(0, 0, 0, 0.35)", "important");
  tooltip.style.setProperty("font-family", "Inter, Arial, sans-serif", "important");
  tooltip.style.setProperty("font-size", "11px", "important");
  tooltip.style.setProperty("color", "#ffffff", "important");
  tooltip.style.setProperty("transition", "opacity 0.15s ease, transform 0.15s ease", "important");
  tooltip.style.setProperty("pointer-events", interactive ? "auto" : "none", "important");
  setTooltipVisible(tooltip, false);
}

function styleTooltipLink(link) {
  link.style.setProperty("display", "inline-block", "important");
  link.style.setProperty("margin-top", "8px", "important");
  link.style.setProperty("color", "#00d4ff", "important");
  link.style.setProperty("font-weight", "600", "important");
  link.style.setProperty("text-decoration", "none", "important");
  link.style.setProperty("pointer-events", "auto", "important");
}

function trustScoreBarHtml(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) return "";
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const barColor =
    clamped >= 70 ? "#10b981" : clamped >= 40 ? "#f59e0b" : "#E05252";
  return `
    <div style="margin:8px 0 10px !important;">
      <div style="display:flex !important;justify-content:space-between !important;align-items:center !important;margin-bottom:4px !important;font-size:10px !important;">
        <span style="color:rgba(255,255,255,0.65) !important;text-transform:uppercase !important;letter-spacing:0.06em !important;">TrustScore</span>
        <span style="color:#00d4ff !important;font-weight:700 !important;font-family:IBM Plex Mono,monospace !important;">${clamped}/100</span>
      </div>
      <div style="height:4px !important;border-radius:999px !important;background:rgba(255,255,255,0.12) !important;overflow:hidden !important;">
        <div style="height:100% !important;width:${clamped}% !important;background:${barColor} !important;border-radius:999px !important;"></div>
      </div>
    </div>`;
}

function signalRowHtml(label, ok) {
  const mark = ok ? "OK" : "—";
  const markColor = ok ? "#10b981" : "#64748b";
  return `
    <div class="bt-tooltip-row">
      <span style="color:${markColor} !important;font-weight:700 !important;font-size:10px !important;min-width:18px !important;">${mark}</span>
      <span>${label}</span>
    </div>`;
}

/**
 * Popup au survol — TrustScore + signaux principaux.
 * @param {HTMLElement} badge
 * @param {{ status: string, entityName?: string|null, trustScore?: number|null, signals?: { kycVerified?: boolean, inNetwork?: boolean, polygonAnchored?: boolean } }} result
 */
function attachBadgeTooltip(badge, result) {
  if (result.status !== "CERTIFIED") return;

  badge.style.cursor = "help";

  const signals = result.signals || {};
  const rows = [
    { label: "Vérification d'identité", ok: Boolean(signals.kycVerified) },
    { label: "Dans votre réseau", ok: Boolean(signals.inNetwork) },
    { label: "Ancré Polygon", ok: Boolean(signals.polygonAnchored) },
  ];
  const entityLine =
    result.entityName && String(result.entityName).trim()
      ? `<div style="margin-bottom:6px !important;color:rgba(255,255,255,0.75) !important;font-size:11px !important;">${String(result.entityName).trim()}</div>`
      : "";

  badge.addEventListener("mouseenter", () => {
    if (!activeTooltip) {
      activeTooltip = document.createElement("div");
      activeTooltip.className = "bt-tooltip";
      activeTooltip.setAttribute("role", "tooltip");
      document.body.appendChild(activeTooltip);
    } else {
      activeTooltip.className = "bt-tooltip";
    }
    applyTooltipBaseStyles(activeTooltip, false);

    activeTooltip.innerHTML = `
      <span class="bt-tooltip-title">BLOCKTRUST™</span>
      ${entityLine}
      ${trustScoreBarHtml(result.trustScore)}
      ${rows.map((row) => signalRowHtml(row.label, row.ok)).join("")}
    `;

    positionTooltip(activeTooltip, badge);
    requestAnimationFrame(() => {
      if (activeTooltip) setTooltipVisible(activeTooltip, true);
    });
  });

  badge.addEventListener("mouseleave", hideBadgeTooltip);
  badge.addEventListener("blur", hideBadgeTooltip);
}

/**
 * Tooltip expéditeur non certifié + lien inscription.
 * @param {HTMLElement} badge
 */
function attachUnknownBadgeTooltip(badge) {
  badge.style.cursor = "help";

  badge.addEventListener("mouseenter", () => {
    if (!activeTooltip) {
      activeTooltip = document.createElement("div");
      activeTooltip.setAttribute("role", "tooltip");
      document.body.appendChild(activeTooltip);
    }
    applyTooltipBaseStyles(activeTooltip, true);

    activeTooltip.innerHTML = `
      <span class="bt-tooltip-title">BLOCKTRUST™ — Non vérifié</span>
      <div class="bt-tooltip-row bt-tooltip-muted">
        Expéditeur non certifié<br>
        Aucune preuve d'identité disponible<br>
        <span class="bt-tooltip-highlight">Certifiez-vous gratuitement</span>
      </div>
      <a class="bt-tooltip-link" href="https://blocktrust.tech/pricing" target="_blank" rel="noopener noreferrer">
        → Certifier son identité sur blocktrust.tech
      </a>
    `;

    const link = activeTooltip.querySelector("a");
    if (link) styleTooltipLink(link);

    positionTooltip(activeTooltip, badge);
    requestAnimationFrame(() => {
      if (activeTooltip) setTooltipVisible(activeTooltip, true);
    });
  });

  badge.addEventListener("mouseleave", (e) => {
    if (activeTooltip?.contains(e.relatedTarget)) return;
    hideBadgeTooltip();
  });
}

/**
 * Badge visuel à insérer à côté du nom / email expéditeur.
 * @param {{ status: string, message?: string, trustScore?: number|null, signals?: object }} result
 */
function createVerifyBadge(result) {
  const badge = document.createElement("span");
  badge.setAttribute("role", "status");

  const baseStyles = `
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 2px 8px !important;
    border-radius: 10px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    margin-left: 8px !important;
    font-family: Inter, Arial, sans-serif !important;
    vertical-align: middle !important;
    cursor: default !important;
    z-index: 9999 !important;
    position: relative !important;
    white-space: nowrap !important;
    text-decoration: none !important;
    line-height: 1.4 !important;
    letter-spacing: 0 !important;
    box-sizing: border-box !important;
  `;

  let colorStyles = "";
  let statusClass = "bt-unknown";
  let text = "";

  if (result.status === "CERTIFIED") {
    statusClass = "bt-certified";
    colorStyles = `
      background: #10b981 !important;
      color: #ffffff !important;
      border: none !important;
    `;
    const score =
      typeof result.trustScore === "number" && Number.isFinite(result.trustScore)
        ? Math.round(result.trustScore)
        : null;
    text =
      score != null
        ? `✓ Certifié • Score ${score}/100`
        : "✓ Certifié BLOCKTRUST™";
  } else if (result.status === "IN_CONTACTS") {
    statusClass = "bt-contacts";
    colorStyles = `
      background: #0ea5e9 !important;
      color: #ffffff !important;
      border: none !important;
    `;
    text = "◎ Dans vos contacts";
  } else if (result.status === "FRAUD") {
    statusClass = "bt-fraud";
    colorStyles = `
      background: #ef4444 !important;
      color: #ffffff !important;
      border: none !important;
    `;
    text = "⚠ FRAUDE";
  } else if (result.status === "UNKNOWN") {
    statusClass = "bt-unknown";
    colorStyles = `
      background: rgba(100,116,139,0.15) !important;
      border: 1px solid rgba(100,116,139,0.3) !important;
      color: #94a3b8 !important;
    `;
    text = "? Non vérifié BLOCKTRUST™";
  } else {
    statusClass = "bt-unknown";
    colorStyles = `
      background: rgba(100,116,139,0.15) !important;
      border: 1px solid rgba(100,116,139,0.3) !important;
      color: #94a3b8 !important;
    `;
    text = "? Non certifié";
  }

  badge.className = `bt-trust-badge bt-badge ${statusClass}`;
  badge.setAttribute("style", baseStyles + colorStyles);
  badge.textContent = text;

  if (result.status === "CERTIFIED") {
    attachBadgeTooltip(badge, result);
  } else if (result.status === "UNKNOWN") {
    attachUnknownBadgeTooltip(badge);
  } else {
    badge.title = result.message || result.status || "";
  }

  return badge;
}

/**
 * Injecte le badge immédiatement après l’élément expéditeur Gmail.
 * @param {Element} senderElement
 * @param {HTMLElement} badge
 */
function injectBadge(senderElement, badge) {
  const parent = senderElement.parentElement;
  if (!parent) {
    senderElement.insertAdjacentElement("afterend", badge);
    console.log("[BLOCKTRUST] Badge injecté (afterend):", badge.textContent);
    return;
  }

  const existing = parent.querySelector(".bt-trust-badge");
  if (existing) existing.remove();

  parent.insertBefore(badge, senderElement.nextSibling);
  console.log("[BLOCKTRUST] Badge injecté:", badge.textContent);
}

/**
 * Normalise une chaîne en email si possible.
 * @param {string | null} raw
 * @returns {string | null}
 */
function normalizeEmailString(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.includes("@")) return null;
  const m = t.match(/([^\s<>]+@[^\s<>]+)/);
  return m ? m[1].toLowerCase() : t.toLowerCase();
}

/**
 * Un email est-il ouvert (vue message) et non la liste inbox ?
 */
function isOpenEmailView() {
  const main = document.querySelector('[role="main"]');
  if (!main) return false;

  const openBody = main.querySelector(".a3s.aiL, .a3s.aiL > div");
  if (openBody) return true;

  const threadMessage = main.querySelector(".gs .gD[email], .gs [email].go");
  if (threadMessage) return true;

  return false;
}

/**
 * Racine DOM du message ouvert (évite les lignes inbox).
 * @returns {ParentNode | null}
 */
function getOpenMessageRoot() {
  const main = document.querySelector('[role="main"]');
  if (!main) return null;

  const bodies = main.querySelectorAll(".a3s.aiL");
  if (bodies.length > 0) {
    const last = bodies[bodies.length - 1];
    return last.closest(".gs") || last.closest("[data-message-id]") || last.parentElement;
  }

  const headerInThread = main.querySelector(".gs .gD[email], .gs [email].go");
  if (headerInThread) {
    return headerInThread.closest(".gs") || headerInThread.closest(".adn") || main;
  }

  return null;
}

/**
 * Expéditeur du message actuellement ouvert.
 * @returns {{ email: string, element: Element } | null}
 */
function extractSenderFromOpenEmail() {
  if (!isOpenEmailView()) return null;

  const root = getOpenMessageRoot();
  if (!root) return null;

  for (const selector of SENDER_SELECTORS) {
    console.log("[BLOCKTRUST] Sélecteur testé:", selector);
    const el = root.querySelector(selector);
    console.log("[BLOCKTRUST] Élément trouvé:", el);
    if (!el) continue;

    if (el.closest("tr.zA, .zA")) continue;

    const raw =
      el.getAttribute("email") ||
      el.getAttribute("data-hovercard-id") ||
      el.getAttribute("data-email");
    const email = normalizeEmailString(raw || (el.textContent || "").trim());
    if (email) {
      console.log("[BLOCKTRUST] Email expéditeur:", email);
      return { email, element: el };
    }
  }
  return null;
}

function hasTrustBadgeNear(el) {
  const parent = el.parentElement;
  if (parent?.querySelector(".bt-trust-badge")) return true;
  if (el.nextElementSibling?.classList?.contains("bt-trust-badge")) return true;
  return false;
}

/** Dernier email traité (évite re-queue sur mutations DOM identiques). */
let lastProcessedEmail = null;

/**
 * Scan uniquement l’email ouvert — ajout à la queue si nécessaire.
 */
function processOpenEmailSender() {
  if (!isOpenEmailView()) {
    lastProcessedEmail = null;
    return;
  }

  const sender = extractSenderFromOpenEmail();
  if (!sender) return;

  if (hasTrustBadgeNear(sender.element)) {
    lastProcessedEmail = sender.email;
    return;
  }

  if (lastProcessedEmail === sender.email && scanQueue.some((i) => i.email === sender.email)) {
    return;
  }

  console.log("[BLOCKTRUST] Sender détecté:", sender.email);
  lastProcessedEmail = sender.email;

  const domain = sender.email.split("@")[1] || "";
  addToQueue(sender.email, domain, sender.element);
}

/** Debounce : Gmail émet énormément de mutations */
let gmailDebounceId = null;

function scheduleGmailScan() {
  if (gmailDebounceId !== null) clearTimeout(gmailDebounceId);
  gmailDebounceId = setTimeout(() => {
    gmailDebounceId = null;
    if (!isOpenEmailView()) return;
    console.log("[BLOCKTRUST] DOM changé — scan email ouvert...");
    processOpenEmailSender();
  }, 400);
}

function observeGmail() {
  const observer = new MutationObserver(() => {
    scheduleGmailScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  scheduleGmailScan();
}

function bootstrapBlockTrust() {
  injectGlobalStyles();
  observeGmail();
}

if (document.body) {
  bootstrapBlockTrust();
} else {
  document.addEventListener("DOMContentLoaded", bootstrapBlockTrust, { once: true });
}
