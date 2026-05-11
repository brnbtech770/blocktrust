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

console.log("[BLOCKTRUST] Extension chargée sur Gmail");

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
    if (!response.ok) return null;

    const data = await response.json();
    verifyCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    console.warn("[TrustScan] verify-sender erreur:", e);
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
  badge.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "gap:4px",
    "padding:2px 8px",
    "border-radius:12px",
    "font-size:11px",
    "font-weight:600",
    'font-family:Inter,system-ui,sans-serif',
    "margin-left:8px",
    "vertical-align:middle",
    "border:1px solid",
    "transition:opacity 0.2s",
  ].join(";");

  if (result.status === "CERTIFIED") {
    badge.style.background = "rgba(16, 185, 129, 0.12)";
    badge.style.borderColor = "rgba(16, 185, 129, 0.45)";
    badge.style.color = "#10b981";
    badge.textContent = "Certifié BLOCKTRUST";
  } else if (result.status === "IN_CONTACTS") {
    badge.style.background = "rgba(0, 212, 255, 0.1)";
    badge.style.borderColor = "rgba(0, 212, 255, 0.35)";
    badge.style.color = "#00d4ff";
    badge.textContent = "Dans vos contacts";
  } else if (result.status === "FRAUD") {
    badge.style.background = "rgba(239, 68, 68, 0.12)";
    badge.style.borderColor = "rgba(239, 68, 68, 0.45)";
    badge.style.color = "#ef4444";
    badge.textContent = "Alerte — badge invalide";
  } else {
    badge.style.background = "rgba(255, 255, 255, 0.06)";
    badge.style.borderColor = "rgba(255, 255, 255, 0.12)";
    badge.style.color = "rgba(255,255,255,0.5)";
    badge.textContent = "Non certifié";
  }

  return badge;
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
    const el = document.querySelector(selector);
    if (!el) continue;
    const raw =
      el.getAttribute("email") ||
      el.getAttribute("data-hovercard-id") ||
      el.getAttribute("data-email");
    const email = normalizeEmailString(raw || (el.textContent || "").trim());
    if (email) return { email, element: el };
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

/**
 * Ancrage pour badge (évite doublons sur la même ligne).
 * @param {Element} el
 */
function findBadgeAnchor(el) {
  let row = el.closest("tr") || el.parentElement;
  if (!row) return el.parentElement;
  return row;
}

function hasTrustBadgeNear(el) {
  const wrap = el.parentElement;
  if (wrap && wrap.querySelector(".bt-trust-badge, .bt-badge")) return true;
  const anchor = findBadgeAnchor(el);
  if (anchor && anchor.querySelector(".bt-trust-badge, .bt-badge")) return true;
  return false;
}

/**
 * Traite un élément candidat expéditeur (liste / sous-arbre).
 * @param {Element} el
 */
async function processSenderElement(el) {
  if (el.dataset.btProcessed === "true") return;
  const email = extractSenderEmail(el);
  if (!email) return;

  if (hasTrustBadgeNear(el)) return;

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

  const wrap = el.parentElement;
  const anchor = findBadgeAnchor(el);
  if (!anchor) {
    delete el.dataset.btProcessed;
    return;
  }

  const badge = createVerifyBadge(result);
  if (wrap && !wrap.querySelector(".bt-trust-badge, .bt-badge")) {
    wrap.appendChild(badge);
  } else if (!anchor.querySelector(".bt-trust-badge, .bt-badge")) {
    anchor.appendChild(badge);
  }
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

  const parent = sender.element.parentElement;
  if (!parent) return;
  if (parent.querySelector(".bt-trust-badge, .bt-badge")) return;

  const apiKey = await getApiKey();
  if (!apiKey) return;

  const domain = sender.email.split("@")[1] || "";
  const result = await verifySender(sender.email, domain);
  console.log("[BLOCKTRUST] Résultat API:", result);
  if (!result) return;

  const badge = createVerifyBadge(result);
  parent.appendChild(badge);
}

/** Debounce : Gmail émet énormément de mutations */
let gmailDebounceId = null;

function scheduleGmailScan() {
  if (gmailDebounceId !== null) clearTimeout(gmailDebounceId);
  gmailDebounceId = setTimeout(() => {
    gmailDebounceId = null;
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
