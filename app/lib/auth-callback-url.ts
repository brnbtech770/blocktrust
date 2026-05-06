// Validation callbackUrl / redirections post-auth (anti open redirect).

/** Prevent open redirects via NextAuth callbackUrl / client-side redirects after sign-in. */
export function isSafeCallbackUrl(url: string, trustedBaseUrl?: string): boolean {
  try {
    const parsed = new URL(url, trustedBaseUrl ?? "https://blocktrust.tech");
    if (
      parsed.hostname === "blocktrust.tech" ||
      parsed.hostname === "localhost"
    ) {
      return true;
    }
    if (trustedBaseUrl) {
      const base = new URL(trustedBaseUrl);
      return parsed.origin === base.origin;
    }
    return false;
  } catch {
    return url.startsWith("/");
  }
}

/** Si callbackUrl non validé → `/dashboard`. */
export function sanitizeCallbackUrl(url: string | null | undefined): string {
  const trimmed = (url ?? "").trim();
  const candidate = trimmed.length > 0 ? trimmed : "/dashboard";
  return isSafeCallbackUrl(candidate) ? candidate : "/dashboard";
}
