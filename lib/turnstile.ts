// lib/turnstile.ts
// Vérification Cloudflare Turnstile (inscription)
// ============================================================

export async function verifyTurnstileToken(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[turnstile] TURNSTILE_SECRET_KEY absent — vérification ignorée");
    }
    return process.env.NODE_ENV !== "production";
  }

  if (!token?.trim()) return false;

  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (err) {
    console.error("[turnstile] verify error", err);
    return false;
  }
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}
