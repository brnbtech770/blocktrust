/** Réseaux supportés côté formulaire / API (minuscules en base). */
export const WALLET_NETWORK_VALUES = [
  "ethereum",
  "polygon",
  "bitcoin",
  "solana",
  "autre",
] as const;

export type WalletNetworkValue = (typeof WALLET_NETWORK_VALUES)[number];

export function normalizeWalletNetwork(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * Adresse optionnelle : chaîne vide → valide.
 * Si une adresse est fournie, un réseau cohérent est requis (validé par l’appelant).
 */
export function isValidWalletAddress(address: string, network: string): boolean {
  const a = address.trim();
  if (!a) return true;
  const n = normalizeWalletNetwork(network);
  if (n === "ethereum" || n === "polygon") {
    return /^0x[a-fA-F0-9]{40}$/.test(a);
  }
  if (n === "bitcoin") {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a);
  }
  if (n === "solana") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
  }
  if (n === "autre") {
    return a.length > 10;
  }
  if (!n) return a.length > 10;
  return false;
}

export function isAllowedWalletNetwork(n: string): n is WalletNetworkValue {
  return (WALLET_NETWORK_VALUES as readonly string[]).includes(
    normalizeWalletNetwork(n),
  );
}

/** Les deux absents ou les deux présents avec format valide. */
export function validateWalletPair(
  walletAddress: string | null | undefined,
  walletNetwork: string | null | undefined,
): { ok: true } | { ok: false; message: string } {
  const addr = (walletAddress ?? "").trim();
  const netRaw = (walletNetwork ?? "").trim();
  const net = normalizeWalletNetwork(netRaw);

  if (!addr && !netRaw) return { ok: true };
  if (!addr || !netRaw) {
    return {
      ok: false,
      message:
        "Renseignez à la fois l’adresse wallet et le réseau, ou laissez les deux vides.",
    };
  }
  if (!isAllowedWalletNetwork(net)) {
    return { ok: false, message: "Réseau blockchain non reconnu." };
  }
  if (!isValidWalletAddress(addr, net)) {
    return { ok: false, message: "Format d’adresse invalide pour ce réseau." };
  }
  return { ok: true };
}

/** Libellé FR pour affichage publique (vérif / API). */
export function walletNetworkLabelFr(network: string): string {
  const m: Record<string, string> = {
    ethereum: "Ethereum",
    polygon: "Polygon",
    bitcoin: "Bitcoin",
    solana: "Solana",
    autre: "Autre",
  };
  return m[normalizeWalletNetwork(network)] ?? network;
}
