/**
 * Libellés UI des types d'interaction BIS.
 */
export const BIS_INTERACTION_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  DOCUMENT: 'Document',
  PAYMENT_REQUEST: 'Demande de paiement',
  CONTRACT: 'Contrat',
  MARKETPLACE: 'Marketplace',
}

export function getBisInteractionLabel(type: string): string {
  return BIS_INTERACTION_LABELS[type] ?? type
}
