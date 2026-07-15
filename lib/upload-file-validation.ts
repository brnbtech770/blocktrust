// lib/upload-file-validation.ts
// Validation magic bytes — complète la whitelist MIME (anti-spoof Content-Type).
// ============================================================

export type UploadMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

const ALLOWED_MIME = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function startsWithBytes(buf: Uint8Array, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  return sig.every((b, i) => buf[i] === b);
}

/** Détecte le MIME réel à partir des premiers octets. */
export function detectUploadMimeFromBytes(buf: Uint8Array): UploadMime | null {
  if (startsWithBytes(buf, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    startsWithBytes(buf, [0x52, 0x49, 0x46, 0x46]) &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  if (buf.length >= 5) {
    const head = new TextDecoder().decode(buf.slice(0, Math.min(buf.length, 1024)));
    if (head.startsWith("%PDF-")) {
      return "application/pdf";
    }
  }
  return null;
}

export function isAllowedUploadMime(mime: string): mime is UploadMime {
  return ALLOWED_MIME.has(mime);
}

/** Vérifie que le contenu correspond au MIME déclaré. */
export function validateUploadFileContent(
  declaredMime: string,
  bytes: Uint8Array,
): { ok: true; mime: UploadMime } | { ok: false; message: string } {
  if (!isAllowedUploadMime(declaredMime)) {
    return { ok: false, message: "Type non autorisé (JPG, PNG, WEBP ou PDF)" };
  }

  const detected = detectUploadMimeFromBytes(bytes);
  if (!detected) {
    return { ok: false, message: "Contenu de fichier non reconnu ou corrompu" };
  }
  if (detected !== declaredMime) {
    return { ok: false, message: "Le contenu ne correspond pas au type déclaré" };
  }

  return { ok: true, mime: detected };
}
