/**
 * Script injecté dans Gmail — détection des expéditeurs et appel API BLOCKTRUST.
 * API alignée avec GET /api/extension/verify-sender
 */

const API_BASE = "https://blocktrust.tech";
const CACHE_TTL_MS = 3600000;

/** Cache mémoire (onglet) — même TTL que le cache serveur (~1 h). */
const verifyCache = new Map();

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
 * Appelle l’API de vérification d’expéditeur (session utilisateur côté BLOCKTRUST).
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
 * Badge visuel à insérer à côté du nom / email expéditeur (libellés sans pictogrammes type emoji).
 * @param {{ status: string, message?: string }} result
 */
function createVerifyBadge(result) {
  const badge = document.createElement("span");
  badge.className = "bt-trust-badge";
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
 * Extrait une adresse email depuis un nœud Gmail (attributs ou texte).
 * @param {Element} emailElement
 * @returns {string | null}
 */
function extractSenderEmail(emailElement) {
  const fromAttr =
    emailElement.getAttribute("email") ||
    emailElement.getAttribute("data-hovercard-id") ||
    emailElement.getAttribute("data-email");
  const text = (emailElement.textContent || "").trim();
  const candidate = fromAttr || text;
  if (!candidate || !candidate.includes("@")) return null;
  const match = candidate.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase() : candidate.trim().toLowerCase();
}

/**
 * Trouve un conteneur pour insérer le badge (évite les doublons).
 * @param {Element} el
 */
function findBadgeAnchor(el) {
  let row = el.closest("tr") || el.parentElement;
  if (!row) return el.parentElement;
  return row;
}

/**
 * Traite un élément candidat expéditeur (une fois par élément).
 * @param {Element} el
 */
async function processSenderElement(el) {
  if (el.dataset.btProcessed === "true") return;
  const email = extractSenderEmail(el);
  if (!email) return;

  const wrap = el.parentElement;
  if (wrap && wrap.querySelector(".bt-trust-badge")) return;

  el.dataset.btProcessed = "true";
  const parts = email.split("@");
  const domain = parts[1] || "";

  const result = await verifySender(email, domain);
  if (!result) {
    delete el.dataset.btProcessed;
    return;
  }

  const anchor = findBadgeAnchor(el);
  if (!anchor) {
    delete el.dataset.btProcessed;
    return;
  }

  const badge = createVerifyBadge(result);
  if (wrap) {
    wrap.appendChild(badge);
  } else {
    anchor.appendChild(badge);
  }
}

/**
 * Parcourt le document pour les sélecteurs Gmail courants.
 */
function scanForSenders(root) {
  const selectors = ['[email]', ".gD", ".go", 'span[email]', '[data-hovercard-id]'];
  for (const sel of selectors) {
    root.querySelectorAll(sel).forEach((el) => {
      void processSenderElement(el);
    });
  }
}

/**
 * MutationObserver — Gmail est une SPA, le contenu change souvent.
 */
function observeGmail() {
  const runScan = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = /** @type {Element} */ (node);
    if (el.matches) {
      selectorsCheck(el);
    }
    if (el.querySelectorAll) {
      scanForSenders(el);
    }
  };

  function selectorsCheck(el) {
    const tags = ['[email]', ".gD", ".go", 'span[email]', '[data-hovercard-id]'];
    for (const sel of tags) {
      if (el.matches(sel)) {
        void processSenderElement(el);
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        runScan(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  scanForSenders(document.body);
}

if (document.body) {
  observeGmail();
} else {
  document.addEventListener("DOMContentLoaded", observeGmail, { once: true });
}
