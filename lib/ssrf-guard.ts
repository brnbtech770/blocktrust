// lib/ssrf-guard.ts
// Garde anti-SSRF pour les URLs sortantes contrôlées par l'utilisateur (webhooks
// White Label). Empêche de pointer un webhook vers des cibles internes :
//   - loopback (127.0.0.0/8, ::1)
//   - link-local (169.254.0.0/16 — dont 169.254.169.254 métadonnées cloud, fe80::/10)
//   - privé RFC1918 (10/8, 172.16/12, 192.168/16)
//   - unique-local IPv6 (fc00::/7)
// ============================================================
//
// Politique : valider AVANT tout fetch (envoi ET test). La validation porte sur
// l'IP RÉSOLUE (pas seulement le hostname), sinon un domaine public pointant vers
// une IP interne contournerait le contrôle.
//
// DNS rebinding : on valide à chaque appel. (Pour aller plus loin, fetch sur l'IP
// résolue ; suffisant ici car le White Label n'a pas d'utilisateur actif.)

import { lookup } from "node:dns/promises";

function ipv4ToParts(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isPrivateIpv4(ip: string): boolean {
  const p = ipv4ToParts(ip);
  if (!p) return false;
  const [a, b] = p;
  if (a === 0) return true; // 0.0.0.0/8 « this network »
  if (a === 10) return true; // 10/8 privé
  if (a === 127) return true; // loopback 127/8
  if (a === 169 && b === 254) return true; // link-local 169.254/16 (métadonnées cloud)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 privé
  if (a === 192 && b === 168) return true; // 192.168/16 privé
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast/réservé 224+/240+
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]; // retire l'identifiant de zone (%eth0)
  if (addr === "::1" || addr === "::") return true; // loopback / unspecified

  // IPv4-mapped ::ffff:a.b.c.d → valider l'IPv4 embarquée
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  // link-local fe80::/10 (fe80–febf)
  if (/^fe[89ab]/.test(addr)) return true;
  // unique-local fc00::/7 (fc / fd)
  if (/^f[cd]/.test(addr)) return true;

  return false;
}

/** True si l'IP (v4 ou v6) appartient à une plage interne/réservée. */
export function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateIpv6(ip) : isPrivateIpv4(ip);
}

export type SsrfCheck = { ok: boolean; reason?: string };

/**
 * Valide une URL de webhook : HTTPS uniquement + toutes les IP résolues doivent
 * être publiques. Résolution DNS incluse (le hostname seul ne suffit pas).
 */
export async function isPublicWebhookUrl(rawUrl: string): Promise<SsrfCheck> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "https_required" };
  }

  // Retire les crochets IPv6 éventuels du hostname.
  const hostname = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!hostname) {
    return { ok: false, reason: "invalid_url" };
  }

  // Hostname déjà littéral IP → valider directement (pas de DNS).
  const isLiteralIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");

  let addresses: string[];
  if (isLiteralIp) {
    addresses = [hostname];
  } else {
    try {
      const resolved = await lookup(hostname, { all: true });
      addresses = resolved.map((r) => r.address);
    } catch {
      return { ok: false, reason: "dns_resolution_failed" };
    }
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "no_address" };
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr)) {
      return { ok: false, reason: "private_ip_blocked" };
    }
  }

  return { ok: true };
}
