/** Affichage dashboard — préfixe visible, corps masqué (jamais de clé en clair dans le DOM). */
export const EXTENSION_API_KEY_MASKED_DISPLAY = "bt_ext_••••••••••••••••••••";

/** Indique si l'utilisateur a déjà une clé API extension enregistrée (hash en DB). */
export function userHasExtensionApiKey(
  extensionApiKeyHash: string | null | undefined
): boolean {
  return typeof extensionApiKeyHash === "string" && extensionApiKeyHash.trim().length > 0;
}
