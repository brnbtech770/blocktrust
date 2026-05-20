/**
 * Script injecté dans Gmail — détection des expéditeurs et appel API BLOCKTRUST.
 * API alignée avec GET /api/extension/verify-sender
 * Sélecteurs Gmail (2026) + observer debouncé.
 */

const API_BASE = "https://blocktrust.tech";
const CACHE_TTL_MS = 3600000;

/** Cache mémoire (onglet) — même TTL que le cache serveur (~1 h). */
const verifyCache = new Map();

/** Sélecteurs expéditeur : message ouvert + liste */
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
 * Appelle l’API de vérification d’expéditeur.
 * @param {string} email
 * @param {string} domain
 * @returns {Promise<object|null>}
 */
async function verifySender(email, domain) {
  const cacheKey = `${email.toLowerCase()}|${domain.toLowerCase()}`;
  if (verifyCache.has(cacheKey)) {
    const cached = verifyCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("[BLOCKTRUST] Résultat API (cache):", cached.data);
      return cached.data;
    }
  }

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

    verifyCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    console.warn("[BLOCKTRUST] verify-sender erreur:", e);
    return null;
  }
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
 * Email ouvert / premier expéditeur visible — priorité aux sélecteurs 2026.
 * @returns {{ email: string, element: Element } | null}
 */
function extractSenderFromOpenEmail() {
  for (const selector of SENDER_SELECTORS) {
    console.log("[BLOCKTRUST] Sélecteur testé:", selector);
    const el = document.querySelector(selector);
    console.log("[BLOCKTRUST] Élément trouvé:", el);
    if (!el) continue;
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

/**
 * Extrait une adresse depuis un nœud Gmail (liste ou thread).
 * @param {Element} emailElement
 * @returns {string | null}
 */
function extractSenderEmail(emailElement) {
  const raw =
    emailElement.getAttribute("email") ||
    emailElement.getAttribute("data-hovercard-id") ||
    emailElement.getAttribute("data-email");
  const fromAttr = normalizeEmailString(raw);
  if (fromAttr) return fromAttr;
  const text = (emailElement.textContent || "").trim();
  return normalizeEmailString(text);
}

function hasTrustBadgeNear(el) {
  const parent = el.parentElement;
  if (parent?.querySelector(".bt-trust-badge")) return true;
  if (el.nextElementSibling?.classList?.contains("bt-trust-badge")) return true;
  return false;
}

/**
 * Traite un élément candidat expéditeur (liste / sous-arbre).
 * @param {Element} el
 */
async function processSenderElement(el) {
  if (el.dataset.btProcessed === "true" && hasTrustBadgeNear(el)) return;

  const email = extractSenderEmail(el);
  if (!email) return;

  if (hasTrustBadgeNear(el)) {
    el.dataset.btProcessed = "true";
    return;
  }

  el.dataset.btProcessed = "true";
  const parts = email.split("@");
  const domain = parts[1] || "";

  console.log("[BLOCKTRUST] Sender détecté:", email);

  const result = await verifySender(email, domain);
  console.log("[BLOCKTRUST] Résultat API:", result);
  if (!result) {
    delete el.dataset.btProcessed;
    return;
  }

  const badge = createVerifyBadge(result);
  injectBadge(el, badge);
}

/**
 * Parcourt le document / racine pour tous les sélecteurs expéditeur.
 * @param {ParentNode} root
 */
function scanForSenders(root) {
  for (const sel of SENDER_SELECTORS) {
    root.querySelectorAll(sel).forEach((el) => {
      void processSenderElement(el);
    });
  }
}

/**
 * Message ouvert : premier match + badge à côté du nœud expéditeur.
 */
async function processOpenEmailSender() {
  const sender = extractSenderFromOpenEmail();
  if (!sender) return;

  console.log("[BLOCKTRUST] Sender détecté:", sender.email);

  if (hasTrustBadgeNear(sender.element)) return;

  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log("[BLOCKTRUST] Clé API absente — badge ignoré");
    return;
  }

  const domain = sender.email.split("@")[1] || "";
  const result = await verifySender(sender.email, domain);
  console.log("[BLOCKTRUST] Résultat API:", result);
  if (!result) return;

  const badge = createVerifyBadge(result);
  injectBadge(sender.element, badge);
}

/** Debounce : Gmail émet énormément de mutations */
let gmailDebounceId = null;

function scheduleGmailScan() {
  if (gmailDebounceId !== null) clearTimeout(gmailDebounceId);
  gmailDebounceId = setTimeout(() => {
    gmailDebounceId = null;
    console.log("[BLOCKTRUST] DOM changé — scan en cours...");
    void processOpenEmailSender();
    scanForSenders(document.body);
  }, 200);
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
