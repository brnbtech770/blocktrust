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
    url.searchParams.set("apiKey", apiKey);

    const response = await fetch(url.toString());
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

/**
 * Badge visuel à insérer à côté du nom / email expéditeur.
 * @param {{ status: string, message?: string }} result
 */
function createVerifyBadge(result) {
  const badge = document.createElement("span");
  badge.className = "bt-trust-badge bt-badge";
  badge.setAttribute("role", "status");
  badge.title = result.message || result.status || "";
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
    font-family: Inter, Arial, sans-serif;
    vertical-align: middle;
    cursor: default;
    z-index: 9999;
    position: relative;
    line-height: 1.4;
    white-space: nowrap;
  `;

  if (result.status === "CERTIFIED") {
    badge.style.background = "rgba(16,185,129,0.15)";
    badge.style.border = "1px solid rgba(16,185,129,0.4)";
    badge.style.color = "#10b981";
    badge.innerHTML = "✓ Certifié BLOCKTRUST™";
  } else if (result.status === "IN_CONTACTS") {
    badge.style.background = "rgba(0,212,255,0.1)";
    badge.style.border = "1px solid rgba(0,212,255,0.3)";
    badge.style.color = "#00d4ff";
    badge.innerHTML = "◎ Dans vos contacts";
  } else if (result.status === "FRAUD") {
    badge.style.background = "rgba(239,68,68,0.15)";
    badge.style.border = "1px solid rgba(239,68,68,0.4)";
    badge.style.color = "#ef4444";
    badge.innerHTML = "⚠ FRAUDE DÉTECTÉE";
  } else {
    badge.style.background = "rgba(255,255,255,0.05)";
    badge.style.border = "1px solid rgba(255,255,255,0.1)";
    badge.style.color = "#64748b";
    badge.innerHTML = "? Non certifié";
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
    console.log("[BLOCKTRUST] Badge injecté (afterend):", badge.innerHTML);
    return;
  }

  const existing = parent.querySelector(".bt-trust-badge");
  if (existing) existing.remove();

  parent.insertBefore(badge, senderElement.nextSibling);
  console.log("[BLOCKTRUST] Badge injecté:", badge.innerHTML);
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

if (document.body) {
  observeGmail();
} else {
  document.addEventListener("DOMContentLoaded", observeGmail, { once: true });
}
