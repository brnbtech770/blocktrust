/**
 * Service worker Manifest V3 — TrustScan
 * Écoute minimale (installation / mise à jour).
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[TrustScan] Extension installée — configurez votre clé API dans la popup.");
  } else if (details.reason === "update") {
    console.log("[TrustScan] Extension mise à jour vers", chrome.runtime.getManifest().version);
  }
});
