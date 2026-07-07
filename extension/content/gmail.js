/**
 * Script injecté dans Gmail — détection des expéditeurs et appel API BLOCKTRUST.
 * API alignée avec GET /api/extension/verify-sender
 * Scan uniquement sur l’email ouvert + cache local + queue anti rate-limit.
 */

const API_BASE = "https://blocktrust.tech";
const BT_UI_MARKER = "data-bt-ui";
const TOOLTIP_AUTO_DISMISS_MS = 8000;
const TOOLTIP_MOUSELEAVE_MS = 200;
const GMAIL_SCAN_DEBOUNCE_MS = 300;

/** Cache résultats pour éviter re-appels (5 min). */
const verifyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/** Détection lien BIS dans le corps de l'email (Phase 2a). */
const BIS_LINK_REGEX = /blocktrust\.tech\/verify\/bis\/([a-z0-9]+)/gi;

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

/** Zones de composition Gmail — jamais scannées ni badgées. */
const COMPOSE_SEND_MARKERS = [
  'div[role="button"][aria-label*="Envoyer"]',
  'div[role="button"][aria-label*="Send"]',
  ".T-I.T-I-KE",
];

/**
 * L'élément est-il dans un composeur (dialog, inline reply, éditeur) ?
 * @param {Element | null | undefined} el
 * @returns {boolean}
 */
function isInsideComposeArea(el) {
  if (!(el instanceof Element)) return false;

  if (el.closest('[contenteditable="true"]')) return true;
  if (el.closest('div[role="textbox"]')) return true;
  if (el.closest(".editable")) return true;
  if (el.closest(".Am.Al.editable")) return true;

  const dialog = el.closest('div[role="dialog"]');
  if (dialog && COMPOSE_SEND_MARKERS.some((sel) => dialog.querySelector(sel))) {
    return true;
  }

  const inlineHost = el.closest("div.nH, div.AD, div.aY");
  if (inlineHost && COMPOSE_SEND_MARKERS.some((sel) => inlineHost.querySelector(sel))) {
    return true;
  }

  return false;
}

/** Retire les chips data-bt pollués dans les brouillons (résidu v1.0.8). */
function purgePollutedBadgesFromCompose() {
  const polluted = document.querySelectorAll(
    '[contenteditable="true"] .bt-trust-badge, div[role="textbox"] .bt-trust-badge, .editable .bt-trust-badge, [contenteditable="true"] [data-bt-ui].bt-trust-badge',
  );
  polluted.forEach((badge) => badge.remove());
}

console.log("[BLOCKTRUST] Content script chargé sur Gmail");
console.log("[BLOCKTRUST] API_BASE:", API_BASE);

/**
 * Échappe le texte inséré dans innerHTML (données API / entité).
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    .bt-bis-invalid {
      background: #f59e0b !important;
      color: #0a1628 !important;
      border: none !important;
    }
    .bt-bis-sub {
      display: block !important;
      font-size: 9px !important;
      font-weight: 600 !important;
      opacity: 0.95 !important;
      margin-top: 1px !important;
      letter-spacing: 0.02em !important;
    }
    .bt-tooltip-section {
      margin-top: 10px !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
    }
    .bt-tooltip-warn {
      color: #f59e0b !important;
      line-height: 1.45 !important;
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
async function verifySender(email, domain, bisId) {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  try {
    const url = new URL(`${API_BASE}/api/extension/verify-sender`);
    url.searchParams.set("email", email);
    url.searchParams.set("domain", domain);
    if (bisId) url.searchParams.set("bisId", bisId);

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
async function verifySenderCached(email, domain, bisId) {
  const cacheKey = `${email.toLowerCase()}:${bisId || "-"}`;
  const cached = verifyCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[BLOCKTRUST] Résultat API (cache):", cached.result);
    return cached.result;
  }

  const result = await verifySender(email, domain, bisId);

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
    const { email, domain, bisId, element } = scanQueue.shift();

    const result = await verifySenderCached(email, domain, bisId);
    console.log("[BLOCKTRUST] Résultat API:", result);

    if (result) {
      const badge = createVerifyBadge(result);
      injectBadge(element, badge);
    } else {
      const apiKey = await getApiKey();
      const fallback = apiKey
        ? {
            status: "UNKNOWN",
            message: "Vérification indisponible — réessayez plus tard.",
          }
        : {
            status: "UNKNOWN",
            message: "Extension non connectée — configurez votre clé API.",
          };
      injectBadge(element, createVerifyBadge(fallback));
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
function addToQueue(email, domain, element, bisId) {
  if (isInsideComposeArea(element)) return;

  const queueKey = `${email.toLowerCase()}:${bisId || "-"}`;

  const alreadyQueued = scanQueue.some(
    (item) => `${item.email.toLowerCase()}:${item.bisId || "-"}` === queueKey,
  );
  if (alreadyQueued) return;

  const cached = verifyCache.get(queueKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (cached.result) {
      const badge = createVerifyBadge(cached.result);
      injectBadge(element, badge);
    }
    return;
  }

  scanQueue.push({ email, domain, bisId, element });
  void processQueue();
}

/** Tooltip singleton — un seul vivant à la fois. */
let activeTooltip = null;
let tooltipDismissListenersInstalled = false;
let tooltipHideTimerId = null;
let tooltipAutoDismissId = null;
/** @type {Element | null} */
let tooltipAnchor = null;

function destroyTooltip() {
  if (tooltipHideTimerId !== null) {
    clearTimeout(tooltipHideTimerId);
    tooltipHideTimerId = null;
  }
  if (tooltipAutoDismissId !== null) {
    clearTimeout(tooltipAutoDismissId);
    tooltipAutoDismissId = null;
  }
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
  tooltipAnchor = null;
}

/** Affiche ou masque la tooltip (inline !important — Gmail ignore les classes seules). */
function setTooltipVisible(tooltip, visible) {
  tooltip.style.setProperty("opacity", visible ? "1" : "0", "important");
  tooltip.style.setProperty(
    "transform",
    visible ? "translateY(0)" : "translateY(4px)",
    "important",
  );
  tooltip.style.setProperty("pointer-events", visible ? "auto" : "none", "important");
}

function hideBadgeTooltip() {
  destroyTooltip();
}

function scheduleHideBadgeTooltip(delayMs = TOOLTIP_MOUSELEAVE_MS) {
  if (tooltipHideTimerId !== null) clearTimeout(tooltipHideTimerId);
  tooltipHideTimerId = setTimeout(() => {
    tooltipHideTimerId = null;
    destroyTooltip();
  }, delayMs);
}

function ensureTooltipDismissListeners() {
  if (tooltipDismissListenersInstalled) return;
  tooltipDismissListenersInstalled = true;

  document.addEventListener(
    "scroll",
    () => {
      destroyTooltip();
    },
    true,
  );
  document.addEventListener(
    "click",
    (e) => {
      if (activeTooltip?.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest(".bt-trust-badge")) return;
      destroyTooltip();
    },
    true,
  );
  window.addEventListener("blur", destroyTooltip);
  window.addEventListener("resize", destroyTooltip);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") destroyTooltip();
  });
}

/**
 * @param {HTMLElement} anchor
 * @param {string} html
 * @param {boolean} interactive
 */
function openTooltip(anchor, html, interactive) {
  destroyTooltip();
  ensureTooltipDismissListeners();

  activeTooltip = document.createElement("div");
  activeTooltip.className = "bt-tooltip";
  activeTooltip.setAttribute("role", "tooltip");
  activeTooltip.setAttribute(BT_UI_MARKER, "1");
  document.body.appendChild(activeTooltip);

  applyTooltipBaseStyles(activeTooltip, interactive);
  activeTooltip.innerHTML = html;

  if (interactive) {
    const link = activeTooltip.querySelector("a");
    if (link) styleTooltipLink(link);
    bindInteractiveTooltipDismiss(activeTooltip);
  }

  tooltipAnchor = anchor;
  positionTooltip(activeTooltip, anchor);

  requestAnimationFrame(() => {
    if (activeTooltip) setTooltipVisible(activeTooltip, true);
  });

  tooltipAutoDismissId = setTimeout(() => {
    tooltipAutoDismissId = null;
    destroyTooltip();
  }, TOOLTIP_AUTO_DISMISS_MS);
}

function bindInteractiveTooltipDismiss(tooltip) {
  tooltip.addEventListener("mouseenter", () => {
    if (tooltipHideTimerId !== null) {
      clearTimeout(tooltipHideTimerId);
      tooltipHideTimerId = null;
    }
    if (tooltipAutoDismissId !== null) {
      clearTimeout(tooltipAutoDismissId);
      tooltipAutoDismissId = setTimeout(() => {
        tooltipAutoDismissId = null;
        destroyTooltip();
      }, TOOLTIP_AUTO_DISMISS_MS);
    }
    setTooltipVisible(tooltip, true);
  });
  tooltip.addEventListener("mouseleave", () => scheduleHideBadgeTooltip(TOOLTIP_MOUSELEAVE_MS));
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

function officialAccountBadgeHtml(official) {
  if (!official) return "";
  return `<div style="margin:4px 0 8px !important;font-size:10px !important;font-weight:700 !important;color:#BDA76B !important;letter-spacing:0.04em !important;text-transform:uppercase !important;">Compte officiel BLOCKTRUST™</div>`;
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
      <span>${escapeHtml(label)}</span>
    </div>`;
}

function fileCheckIconSvg(size = 12) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>`;
}

function formatInteractionType(type) {
  const map = {
    EMAIL: "Email",
    DOCUMENT: "Document",
    PAYMENT_REQUEST: "Demande de paiement",
    CONTRACT: "Contrat",
    MARKETPLACE: "Marketplace",
  };
  return map[type] || type || "—";
}

function safeFormatInteractionType(type) {
  return escapeHtml(formatInteractionType(type));
}

function formatDateFr(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function bisTooltipSectionHtml(result) {
  const bis = result.bisVerification;
  if (!result.bisSignatureDetected || !bis) return "";

  if (bis.valid) {
    return `
      <div class="bt-tooltip-section">
        <span class="bt-tooltip-title">Interaction signée</span>
        <div class="bt-tooltip-row"><span>Niveau BIS : ${bis.bisLevel}</span></div>
        <div class="bt-tooltip-row"><span>Type : ${safeFormatInteractionType(bis.interactionType)}</span></div>
        ${
          bis.contextLabel
            ? `<div class="bt-tooltip-row"><span>Contexte : ${escapeHtml(String(bis.contextLabel).trim())}</span></div>`
            : ""
        }
        <div class="bt-tooltip-row"><span>Signé le : ${formatDateFr(bis.signedAt)}</span></div>
        <div class="bt-tooltip-row"><span>Expire le : ${formatDateFr(bis.expiresAt)}</span></div>
        <div class="bt-tooltip-row bt-tooltip-ok" style="margin-top:6px !important;font-weight:700 !important;">
          Signature valide ✓
        </div>
      </div>`;
  }

  return `
    <div class="bt-tooltip-section">
      <span class="bt-tooltip-title" style="color:#f59e0b !important;">Signature BIS</span>
      <div class="bt-tooltip-row bt-tooltip-warn">
        Signature invalide ou expirée
        ${bis.reason ? `<br><span style="font-size:10px !important;">${escapeHtml(bis.reason)}</span>` : ""}
      </div>
    </div>`;
}

function bisMissingAlertHtml(result) {
  if (!result.bisMissingAlert || !result.bisMissingAlertMessage) return "";
  return `
    <div class="bt-tooltip-section">
      <span class="bt-tooltip-title" style="color:#f59e0b !important;">Alerte BIS</span>
      <div class="bt-tooltip-row bt-tooltip-warn">${escapeHtml(result.bisMissingAlertMessage)}</div>
    </div>`;
}

/**
 * Extrait l'ID BIS du corps de l'email ouvert.
 * @returns {string | null}
 */
function extractBisIdFromOpenEmail() {
  const root = getOpenMessageRoot();
  if (!root) return null;

  const body = root.querySelector(".a3s.aiL");
  if (!body) return null;

  const haystack = `${body.innerHTML || ""}\n${body.textContent || ""}`;
  BIS_LINK_REGEX.lastIndex = 0;
  const match = BIS_LINK_REGEX.exec(haystack);
  return match?.[1] ? match[1].toLowerCase() : null;
}

/**
 * Popup au survol — TrustScore + signaux principaux.
 * @param {HTMLElement} badge
 * @param {{ status: string, entityName?: string|null, trustScore?: number|null, signals?: { kycVerified?: boolean, inNetwork?: boolean, polygonAnchored?: boolean } }} result
 */
function attachBadgeTooltip(badge, result) {
  if (result.status !== "CERTIFIED" && !(result.bisSignatureDetected && result.bisVerification)) {
    return;
  }

  ensureTooltipDismissListeners();
  badge.style.cursor = "help";

  const signals = result.signals || {};
  const rows = [
    { label: "Vérification d'identité", ok: Boolean(signals.kycVerified) },
    ...(signals.inContact ? [{ label: "Contact vérifié", ok: true }] : []),
    ...(signals.inNetwork ? [{ label: "Dans votre réseau", ok: true }] : []),
    { label: "Ancré Polygon", ok: Boolean(signals.polygonAnchored) },
  ];
  const entityLine =
    result.entityName && String(result.entityName).trim()
      ? `<div style="margin-bottom:6px !important;color:rgba(255,255,255,0.75) !important;font-size:11px !important;">${escapeHtml(String(result.entityName).trim())}</div>`
      : "";

  badge.addEventListener("mouseenter", () => {
    const html = `
      <span class="bt-tooltip-title">BLOCKTRUST™</span>
      ${entityLine}
      ${result.status === "CERTIFIED" && result.officialAccount ? officialAccountBadgeHtml(true) : ""}
      ${result.status === "CERTIFIED" ? trustScoreBarHtml(result.trustScore) : ""}
      ${result.status === "CERTIFIED" ? rows.map((row) => signalRowHtml(row.label, row.ok)).join("") : ""}
      ${bisTooltipSectionHtml(result)}
      ${bisMissingAlertHtml(result)}
    `;
    openTooltip(badge, html, false);
  });

  badge.addEventListener("mouseleave", () => scheduleHideBadgeTooltip(TOOLTIP_MOUSELEAVE_MS));
  badge.addEventListener("blur", destroyTooltip);
}

/**
 * Tooltip expéditeur non certifié + lien inscription.
 * @param {HTMLElement} badge
 * @param {{ status?: string, message?: string, signals?: { inNetwork?: boolean, inContact?: boolean } }} [result]
 */
function attachUnknownBadgeTooltip(badge, result) {
  ensureTooltipDismissListeners();
  badge.style.cursor = "help";
  const inNetwork = Boolean(result?.signals?.inNetwork);
  const inContact = Boolean(result?.signals?.inContact);
  const knownHint =
    inNetwork && inContact
      ? "Présent dans votre réseau et vos contacts<br>"
      : inNetwork
        ? "Présent dans votre Trust Circle<br>"
        : inContact
          ? "Présent dans vos contacts<br>"
          : "";

  badge.addEventListener("mouseenter", () => {
    const html = `
      <span class="bt-tooltip-title">BLOCKTRUST™ — Non certifié</span>
      <div class="bt-tooltip-row bt-tooltip-muted">
        ${knownHint}
        Expéditeur non certifié BLOCKTRUST™<br>
        Aucune preuve d'identité disponible<br>
        <span class="bt-tooltip-highlight">Certifiez-vous gratuitement</span>
      </div>
      <a class="bt-tooltip-link" href="https://blocktrust.tech/pricing" target="_blank" rel="noopener noreferrer">
        → Certifier son identité sur blocktrust.tech
      </a>
    `;
    openTooltip(badge, html, true);
  });

  badge.addEventListener("mouseleave", (e) => {
    if (activeTooltip?.contains(e.relatedTarget)) return;
    scheduleHideBadgeTooltip(TOOLTIP_MOUSELEAVE_MS);
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
  let innerHtml = "";

  const bis = result.bisVerification;
  const hasValidBis = Boolean(result.bisSignatureDetected && bis?.valid);
  const hasInvalidBis = Boolean(result.bisSignatureDetected && bis && !bis.valid);

  if (hasInvalidBis) {
    statusClass = "bt-bis-invalid";
    colorStyles = `
      background: #f59e0b !important;
      color: #0a1628 !important;
      border: none !important;
    `;
    innerHtml = `<span>⚠ Signature BIS invalide ou expirée</span>`;
  } else if (result.status === "CERTIFIED") {
    statusClass = "bt-certified";
    colorStyles = `
      background: #10b981 !important;
      color: #ffffff !important;
      border: none !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      padding: 3px 8px !important;
    `;
    const score =
      typeof result.trustScore === "number" && Number.isFinite(result.trustScore)
        ? Math.round(result.trustScore)
        : null;
    const mainLine = result.officialAccount
      ? "✓ Compte officiel BLOCKTRUST™"
      : score != null
        ? `✓ Certifié • Score ${score}/100`
        : "✓ Certifié BLOCKTRUST™";
    const networkLine =
      result.signals?.inNetwork && result.signals?.inContact
        ? `<span class="bt-bis-sub">Dans votre réseau · Contact vérifié</span>`
        : result.signals?.inNetwork
          ? `<span class="bt-bis-sub">Dans votre réseau</span>`
          : result.signals?.inContact
            ? `<span class="bt-bis-sub">Contact vérifié</span>`
            : "";
    const bisLine = hasValidBis
      ? `<span class="bt-bis-sub">${fileCheckIconSvg(10)} BIS Niveau ${bis.bisLevel} — Signé</span>`
      : result.bisMissingAlert
        ? `<span class="bt-bis-sub" style="color:#fef3c7 !important;">⚠ Sans signature BIS</span>`
        : "";
    innerHtml = `<span style="display:inline-flex !important;align-items:center !important;gap:4px !important;">${mainLine}</span>${networkLine}${bisLine}`;
  } else if (result.status === "IN_CONTACTS") {
    statusClass = "bt-unknown";
    colorStyles = `
      background: rgba(100,116,139,0.15) !important;
      border: 1px solid rgba(100,116,139,0.3) !important;
      color: #94a3b8 !important;
    `;
    innerHtml = result.signals?.inNetwork
      ? "◎ Réseau — non certifié"
      : "? Connu — non certifié";
  } else if (result.status === "FRAUD") {
    statusClass = "bt-fraud";
    colorStyles = `
      background: #ef4444 !important;
      color: #ffffff !important;
      border: none !important;
    `;
    innerHtml = "⚠ FRAUDE";
  } else if (result.status === "UNKNOWN") {
    statusClass = "bt-unknown";
    colorStyles = `
      background: rgba(100,116,139,0.15) !important;
      border: 1px solid rgba(100,116,139,0.3) !important;
      color: #94a3b8 !important;
    `;
    innerHtml = "? Non vérifié BLOCKTRUST™";
  } else {
    statusClass = "bt-unknown";
    colorStyles = `
      background: rgba(100,116,139,0.15) !important;
      border: 1px solid rgba(100,116,139,0.3) !important;
      color: #94a3b8 !important;
    `;
    innerHtml = "? Non certifié";
  }

  badge.className = `bt-trust-badge bt-badge ${statusClass}`;
  badge.setAttribute(BT_UI_MARKER, "1");
  badge.setAttribute("style", baseStyles + colorStyles);
  badge.innerHTML = innerHtml;

  if (result.status === "CERTIFIED" || hasInvalidBis || hasValidBis) {
    attachBadgeTooltip(badge, result);
  } else if (result.status === "UNKNOWN" || result.status === "IN_CONTACTS") {
    attachUnknownBadgeTooltip(badge, result);
  } else {
    badge.title = escapeHtml(result.message || result.status || "");
  }

  return badge;
}

/**
 * Injecte le badge immédiatement après l’élément expéditeur Gmail.
 * @param {Element} senderElement
 * @param {HTMLElement} badge
 */
function injectBadge(senderElement, badge) {
  if (isInsideComposeArea(senderElement)) {
    console.warn("[BLOCKTRUST] Badge ignoré — élément dans un composeur");
    return;
  }

  const parent = senderElement.parentElement;
  if (!parent) {
    if (senderElement.nextElementSibling?.classList?.contains("bt-trust-badge")) return;
    senderElement.insertAdjacentElement("afterend", badge);
    return;
  }

  const existing = parent.querySelector(".bt-trust-badge");
  if (existing) existing.remove();

  parent.insertBefore(badge, senderElement.nextSibling);
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

  const receivedBodies = Array.from(main.querySelectorAll(".a3s.aiL")).filter(
    (body) => !isInsideComposeArea(body),
  );
  if (receivedBodies.length > 0) return true;

  const threadMessage = main.querySelector(".gs .gD[email], .gs [email].go");
  if (threadMessage && !isInsideComposeArea(threadMessage)) return true;

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
    const received = Array.from(bodies).filter((b) => !isInsideComposeArea(b));
    const last = received[received.length - 1];
    if (!last) return null;
    return last.closest(".gs") || last.closest("[data-message-id]") || last.parentElement;
  }

  const headerInThread = main.querySelector(".gs .gD[email], .gs [email].go");
  if (headerInThread && !isInsideComposeArea(headerInThread)) {
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
    if (isInsideComposeArea(el)) continue;

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

/** Dernière clé traitée (email + BIS) — évite re-queue sur mutations DOM identiques. */
let lastProcessedKey = null;

/**
 * Scan uniquement l’email ouvert — ajout à la queue si nécessaire.
 */
function processOpenEmailSender() {
  destroyTooltip();

  if (!isOpenEmailView()) {
    lastProcessedKey = null;
    return;
  }

  const sender = extractSenderFromOpenEmail();
  if (!sender) return;

  const bisId = extractBisIdFromOpenEmail();
  const processKey = `${sender.email}:${bisId || ""}`;

  if (hasTrustBadgeNear(sender.element) && lastProcessedKey === processKey) {
    return;
  }

  if (
    lastProcessedKey === processKey &&
    scanQueue.some(
      (i) => `${i.email}:${i.bisId || ""}` === processKey,
    )
  ) {
    return;
  }

  console.log("[BLOCKTRUST] Sender détecté:", sender.email, bisId ? `(BIS: ${bisId})` : "");
  lastProcessedKey = processKey;

  const domain = sender.email.split("@")[1] || "";
  addToQueue(sender.email, domain, sender.element, bisId);
}

/** Debounce : Gmail émet énormément de mutations */
let gmailDebounceId = null;

/**
 * @param {Node} node
 * @returns {boolean}
 */
function nodeIsBtUiMutation(node) {
  if (!(node instanceof Element)) return false;
  if (node.hasAttribute(BT_UI_MARKER)) return true;
  if (node.hasAttribute("data-bt-bis-block")) return true;
  if (node.classList?.contains("bt-trust-badge")) return true;
  if (node.classList?.contains("bt-tooltip")) return true;
  if (node.id === "bt-compose-toast" || node.id === "bt-bis-auto-badge") return true;
  if (node.closest(`[${BT_UI_MARKER}]`)) return true;
  if (node.closest("[data-bt-bis-block]")) return true;
  return false;
}

/**
 * @param {MutationRecord} mutation
 * @returns {boolean}
 */
function isIgnorableGmailMutation(mutation) {
  if (nodeIsBtUiMutation(mutation.target)) return true;
  for (const node of mutation.addedNodes) {
    if (nodeIsBtUiMutation(node)) return true;
  }
  for (const node of mutation.removedNodes) {
    if (nodeIsBtUiMutation(node)) return true;
  }
  return false;
}

function scheduleGmailScan() {
  if (gmailDebounceId !== null) clearTimeout(gmailDebounceId);
  gmailDebounceId = setTimeout(() => {
    gmailDebounceId = null;
    if (!isOpenEmailView()) return;
    processOpenEmailSender();
  }, GMAIL_SCAN_DEBOUNCE_MS);
}

function observeGmail() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.every(isIgnorableGmailMutation)) return;
    scheduleGmailScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  purgePollutedBadgesFromCompose();
  scheduleGmailScan();
}

function bootstrapBlockTrust() {
  injectGlobalStyles();
  observeGmail();

  if (globalThis.BlockTrustGmailCompose) {
    globalThis.BlockTrustGmailCompose.init({
      apiBase: API_BASE,
      getApiKey,
      escapeHtml,
    });
  }
}

if (document.body) {
  bootstrapBlockTrust();
} else {
  document.addEventListener("DOMContentLoaded", bootstrapBlockTrust, { once: true });
}
