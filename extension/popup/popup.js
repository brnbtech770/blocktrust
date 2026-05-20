/**
 * Popup TrustScan — connexion par clé API + lecture du profil (/api/extension/me)
 */

const API_BASE = "https://blocktrust.tech";

const el = {
  statusBar: document.getElementById("extension-status-bar"),
  notConnected: document.getElementById("not-connected"),
  connected: document.getElementById("connected"),
  statusMsg: document.getElementById("status-msg"),
  apiKeyInput: document.getElementById("api-key-input"),
  connectBtn: document.getElementById("connect-btn"),
  disconnectBtn: document.getElementById("disconnect-btn"),
  userName: document.getElementById("user-name"),
  userPlan: document.getElementById("user-plan"),
  userScore: document.getElementById("user-score"),
  userContacts: document.getElementById("user-contacts"),
};

function showStatus(message, isError) {
  if (!el.statusMsg) return;
  el.statusMsg.textContent = message;
  el.statusMsg.classList.remove("hidden", "error");
  if (isError) el.statusMsg.classList.add("error");
}

function hideStatus() {
  if (!el.statusMsg) return;
  el.statusMsg.classList.add("hidden");
  el.statusMsg.textContent = "";
}

function showPanel(mode) {
  if (el.notConnected) el.notConnected.classList.toggle("hidden", mode !== "not-connected");
  if (el.connected) el.connected.classList.toggle("hidden", mode !== "connected");
}

/**
 * Barre de statut en tête du popup (Gmail / connexion).
 * @param {boolean | undefined} isGmail
 * @param {boolean} isConnected
 */
function updateStatusBar(isGmail, isConnected) {
  if (!el.statusBar) return;
  el.statusBar.classList.remove(
    "extension-status-bar--active",
    "extension-status-bar--idle",
    "extension-status-bar--disconnected"
  );

  if (!isConnected) {
    el.statusBar.classList.add("extension-status-bar--disconnected");
    el.statusBar.textContent = "Non connecté";
    return;
  }

  if (isGmail) {
    el.statusBar.classList.add("extension-status-bar--active");
    el.statusBar.textContent = "Actif sur Gmail ✓";
  } else {
    el.statusBar.classList.add("extension-status-bar--idle");
    el.statusBar.textContent = "Ouvrez Gmail pour activer";
  }
}

function refreshStatusBar(isConnected) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const isGmail = Boolean(tabs[0]?.url?.includes("mail.google.com"));
    updateStatusBar(isGmail, isConnected);
  });
}

/**
 * Charge la clé depuis chrome.storage.local
 */
function getStoredApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiKey"], (r) => resolve(r.apiKey || null));
  });
}

/**
 * Valide le format bt_ext_ + 64 hex (aligné serveur BLOCKTRUST).
 * @param {string} key
 */
function looksLikeExtensionKey(key) {
  return /^bt_ext_[a-f0-9]{64}$/i.test((key || "").trim());
}

/**
 * Appelle GET /api/extension/me
 * @param {string} apiKey
 */
async function fetchMe(apiKey) {
  const url = new URL(`${API_BASE}/api/extension/me`);
  url.searchParams.set("apiKey", apiKey.trim());
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || "Erreur serveur";
    throw new Error(msg);
  }
  return data;
}

/**
 * Remplit les champs de la section connectée
 */
function fillConnectedUI(data) {
  if (el.userName) el.userName.textContent = data.name || "—";
  if (el.userPlan) el.userPlan.textContent = data.plan || "—";
  if (el.userScore) el.userScore.textContent = String(data.trustScore ?? "—");
  if (el.userContacts) {
    const cur = data.contactsCount;
    const lim = data.contactsLimit;
    if (typeof cur === "number" && typeof lim === "number") {
      el.userContacts.textContent = `${cur} / ${lim}`;
    } else {
      el.userContacts.textContent = "—";
    }
  }
}

async function refreshConnectedView() {
  const key = await getStoredApiKey();
  if (!key) {
    showPanel("not-connected");
    hideStatus();
    refreshStatusBar(false);
    return;
  }
  try {
    const data = await fetchMe(key);
    fillConnectedUI(data);
    showPanel("connected");
    hideStatus();
    refreshStatusBar(true);
  } catch (e) {
    console.warn("[TrustScan] /me:", e);
    const msg = e.message || "Session invalide — reconnectez-vous.";
    showStatus(msg, true);
    await new Promise((resolve) => {
      chrome.storage.local.remove(["apiKey"], resolve);
    });
    showPanel("not-connected");
    refreshStatusBar(false);
  }
}

async function onConnect() {
  hideStatus();
  const raw = (el.apiKeyInput && el.apiKeyInput.value) || "";
  const key = raw.trim();
  if (!key.startsWith("bt_ext_")) {
    showStatus("La clé doit commencer par bt_ext_", true);
    return;
  }
  if (!looksLikeExtensionKey(key)) {
    showStatus("Format invalide : bt_ext_ suivi de 64 caractères hexadécimaux.", true);
    return;
  }
  if (el.connectBtn) el.connectBtn.disabled = true;
  try {
    // 1) Valider auprès du serveur avant stockage local
    const data = await fetchMe(key);
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ apiKey: key }, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
    fillConnectedUI(data);
    if (el.apiKeyInput) el.apiKeyInput.value = "";
    showPanel("connected");
    hideStatus();
    refreshStatusBar(true);
  } catch (e) {
    showStatus(e.message || "Échec de la connexion — clé refusée par BLOCKTRUST.", true);
  } finally {
    if (el.connectBtn) el.connectBtn.disabled = false;
  }
}

function onDisconnect() {
  hideStatus();
  chrome.storage.local.remove(["apiKey"], () => {
    if (el.apiKeyInput) el.apiKeyInput.value = "";
    showPanel("not-connected");
    refreshStatusBar(false);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const key = await getStoredApiKey();
  if (key && looksLikeExtensionKey(key)) {
    await refreshConnectedView();
  } else {
    showPanel("not-connected");
    refreshStatusBar(false);
  }

  if (el.connectBtn) el.connectBtn.addEventListener("click", onConnect);
  if (el.disconnectBtn) el.disconnectBtn.addEventListener("click", onDisconnect);
});
