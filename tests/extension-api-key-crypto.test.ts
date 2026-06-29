import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  encryptExtensionApiKey,
  decryptExtensionApiKey,
  canEncryptExtensionApiKey,
} from "@/lib/extension-api-key-crypto";
import { generateExtensionApiKey, maskExtensionApiKeyPreview } from "@/lib/api-key";
import { EXTENSION_API_KEY_MASKED_DISPLAY } from "@/lib/extension-api-key";

describe("extension-api-key-crypto", () => {
  const prevSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-extension-api-key-crypto";
  });

  afterEach(() => {
    if (prevSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = prevSecret;
    }
  });

  it("roundtrips encrypt/decrypt", () => {
    const plaintext = "bt_ext_" + "a".repeat(64);
    const enc = encryptExtensionApiKey(plaintext);
    expect(enc).not.toContain(plaintext);
    expect(decryptExtensionApiKey(enc)).toBe(plaintext);
  });

  it("returns null for tampered payload", () => {
    const enc = encryptExtensionApiKey("bt_ext_" + "b".repeat(64));
    expect(decryptExtensionApiKey(enc.slice(0, -2) + "xx")).toBeNull();
  });

  it("canEncryptExtensionApiKey reflects env", () => {
    expect(canEncryptExtensionApiKey()).toBe(true);
    delete process.env.NEXTAUTH_SECRET;
    expect(canEncryptExtensionApiKey()).toBe(false);
  });
});

describe("maskExtensionApiKeyPreview", () => {
  it("always returns fixed masked display without leaking key material", () => {
    const { apiKey, maskedDisplay } = generateExtensionApiKey();
    expect(maskedDisplay).toBe(EXTENSION_API_KEY_MASKED_DISPLAY);
    expect(maskExtensionApiKeyPreview(apiKey)).toBe(maskedDisplay);
    expect(maskedDisplay).not.toContain(apiKey.slice(8));
  });
});
