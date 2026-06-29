/** URL publique Chrome Web Store — TrustScan BLOCKTRUST™. */
export const CHROME_EXTENSION_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL?.trim() ||
  "https://chromewebstore.google.com/detail/bemcnlbifffejlijnndkdgcjpmijfaeg";

export function isChromeExtensionStoreUrlReady(
  url: string = CHROME_EXTENSION_STORE_URL
): boolean {
  return (
    url !== "#" &&
    url.length > 1 &&
    (url.startsWith("https://") || url.startsWith("http://"))
  );
}

/** Attribut DOM posé par le content script TrustScan sur blocktrust.tech. */
export const TRUSTSCAN_DOM_ATTR = "data-blocktrust-trustscan";

export const TRUSTSCAN_BANNER_DISMISS_KEY = "bt_chrome_extension_banner_dismissed";
