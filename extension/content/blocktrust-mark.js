/**
 * Marqueur présence extension sur blocktrust.tech (masque la bannière dashboard).
 */
(function markTrustScanInstalled() {
  document.documentElement.setAttribute("data-blocktrust-trustscan", "installed");
})();
