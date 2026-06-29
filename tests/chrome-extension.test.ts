import { describe, expect, it } from "vitest";
import {
  CHROME_EXTENSION_STORE_URL,
  isChromeExtensionStoreUrlReady,
} from "@/lib/chrome-extension";

describe("chrome-extension", () => {
  it("expose l’URL publique Chrome Web Store par défaut", () => {
    expect(CHROME_EXTENSION_STORE_URL).toContain("chromewebstore.google.com");
    expect(CHROME_EXTENSION_STORE_URL).toContain("bemcnlbifffejlijnndkdgcjpmijfaeg");
    expect(isChromeExtensionStoreUrlReady()).toBe(true);
  });
});
