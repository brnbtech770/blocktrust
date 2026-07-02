import { describe, expect, it } from "vitest";
import { generateExtensionApiKey } from "@/lib/api-key";
import { EXTENSION_API_KEY_MASKED_DISPLAY } from "@/lib/extension-api-key";

describe("extension API key generation", () => {
  it("uses the same masked display for every key (must not be unique in DB)", () => {
    const first = generateExtensionApiKey();
    const second = generateExtensionApiKey();

    expect(first.maskedDisplay).toBe(EXTENSION_API_KEY_MASKED_DISPLAY);
    expect(second.maskedDisplay).toBe(EXTENSION_API_KEY_MASKED_DISPLAY);
    expect(first.maskedDisplay).toBe(second.maskedDisplay);
    expect(first.apiKeyHash).not.toBe(second.apiKeyHash);
    expect(first.apiKey).not.toBe(second.apiKey);
  });
});
