/** Indique si l'utilisateur a déjà une clé API extension enregistrée (hash en DB). */
export function userHasExtensionApiKey(
  extensionApiKeyHash: string | null | undefined
): boolean {
  return typeof extensionApiKeyHash === "string" && extensionApiKeyHash.trim().length > 0;
}
