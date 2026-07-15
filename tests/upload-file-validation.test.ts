import { describe, expect, it } from "vitest";
import {
  detectUploadMimeFromBytes,
  validateUploadFileContent,
} from "@/lib/upload-file-validation";

describe("upload-file-validation", () => {
  it("détecte JPEG, PNG, WEBP et PDF", () => {
    expect(detectUploadMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(
      "image/jpeg",
    );
    expect(
      detectUploadMimeFromBytes(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      detectUploadMimeFromBytes(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
    expect(
      detectUploadMimeFromBytes(new TextEncoder().encode("%PDF-1.7\n")),
    ).toBe("application/pdf");
  });

  it("rejette un MIME déclaré qui ne correspond pas au contenu", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = validateUploadFileContent("image/jpeg", pngHeader);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("ne correspond pas");
    }
  });
});
