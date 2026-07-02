// lib/onboarding.ts
// Contenu et clés localStorage — assistant onboarding dashboard
// ============================================================

export type OnboardingStepId =
  | "welcome"
  | "badge"
  | "extension"
  | "contacts"
  | "bis"
  | "finish";

export type OnboardingFeature = "bis" | "trust-circle" | "extension";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string;
  useCase?: string;
  practicalSteps?: string[];
  bullets?: { label: string; description: string }[];
  highlightTarget?: string;
  linkHref?: string;
  linkLabel?: string;
};

export const ONBOARDING_AUTO_DISMISS_KEY = "bt_onboarding_auto_dismissed";

export function onboardingFeatureSeenKey(feature: OnboardingFeature): string {
  return `bt_onboarding_seen_${feature}`;
}

export const ONBOARDING_FEATURE_TOOLTIPS: Record<
  OnboardingFeature,
  { message: string; linkHref?: string; linkLabel?: string }
> = {
  bis: {
    message:
      "Signez vos interactions pour prouver votre identité. Cliquez ici pour comprendre comment.",
    linkHref: "/dashboard/bis",
    linkLabel: "Ouvrir les signatures BIS",
  },
  "trust-circle": {
    message:
      "Votre réseau de confiance. Ajoutez des contacts pour établir une confiance mutuelle.",
    linkHref: "/dashboard/trust-circle",
    linkLabel: "Ouvrir le Trust Circle",
  },
  extension: {
    message:
      "Générez votre clé API et installez l'extension pour protéger vos emails dans Gmail.",
    linkHref: "/dashboard/extension",
    linkLabel: "Ouvrir Extensions",
  },
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bienvenue",
    body: "Bienvenue sur BLOCKTRUST™ ! En 3 minutes, vous allez comprendre comment protéger vos interactions numériques.",
  },
  {
    id: "badge",
    title: "Votre badge certifié",
    body: "Votre badge est votre identité numérique vérifiable. Partagez-le avec vos contacts — ils pourront vérifier que c'est bien vous.",
    useCase:
      "Vous envoyez un email à un nouveau client. Ajoutez votre lien de vérification dans votre signature email. Le client clique → il voit que vous êtes certifié BLOCKTRUST™.",
    highlightTarget: "badge-section",
    linkHref: "/dashboard/certificates",
    linkLabel: "Voir mes certificats",
  },
  {
    id: "extension",
    title: "L'extension Chrome",
    body: "Installez l'extension TrustScan pour vérifier automatiquement l'identité de vos correspondants dans Gmail.",
    practicalSteps: [
      'Cliquez « Installer l\'extension » (lien Chrome Web Store)',
      'Dans le dashboard, allez dans « Extensions »',
      'Cliquez « Générer ma clé API »',
      'Cliquez « Copier la clé »',
      "Dans Gmail, cliquez l'icône TrustScan",
      "Collez votre clé API",
      "C'est fait — les badges apparaissent dans Gmail",
    ],
    useCase:
      "Vous recevez un email de votre banque. L'extension affiche un badge vert → c'est bien votre banque. Badge gris → méfiance.",
    linkHref: "/dashboard/extension",
    linkLabel: "Configurer l'extension",
  },
  {
    id: "contacts",
    title: "Vos contacts",
    body: "Ajoutez vos contacts pour suivre leur statut de certification. 3 types de contacts :",
    bullets: [
      {
        label: "Contact simple",
        description: "vous le référencez dans votre réseau",
      },
      {
        label: "Contact vérifié",
        description: "il est certifié BLOCKTRUST™",
      },
      {
        label: "Contact mutuel (Trust Circle)",
        description: "confiance réciproque vérifiée",
      },
    ],
    useCase:
      "Votre notaire vous envoie un RIB pour un virement. S'il est dans votre Trust Circle, vous êtes sûr que le RIB est correct. S'il n'est pas certifié → vérifiez par un autre canal avant de payer.",
    linkHref: "/dashboard/entities",
    linkLabel: "Gérer mes contacts",
  },
  {
    id: "bis",
    title: "Signatures BIS",
    body: "Signez vos emails et documents importants avec BIS (BlockTrust Interaction Signature). C'est une preuve cryptographique infalsifiable que c'est bien vous qui avez envoyé ce contenu.",
    bullets: [
      {
        label: "Automatique",
        description: "tous vos emails Gmail sont signés (extension)",
      },
      {
        label: "Sélectif",
        description: "vous choisissez quels emails signer (bouton dans Gmail)",
      },
      {
        label: "Manuel",
        description: "signez depuis le dashboard (pour les documents)",
      },
    ],
    useCase:
      "Vous envoyez un contrat à signer. Vous signez l'interaction avec BIS. Le destinataire reçoit une notification et peut vérifier que le contrat n'a pas été modifié et que c'est bien vous l'expéditeur.",
    linkHref: "/dashboard/bis",
    linkLabel: "Signer avec BIS",
  },
  {
    id: "finish",
    title: "C'est parti !",
    body: "Vous êtes prêt ! Commencez par partager votre badge avec vos contacts.",
    linkHref: "/dashboard/certificates",
    linkLabel: "Partager mon badge",
  },
];

export function shouldAutoOpenOnboarding(
  onboardingCompletedAt: string | null,
  lastLoginAt: string | null,
  autoDismissed: boolean,
): boolean {
  if (autoDismissed || onboardingCompletedAt) return false;
  return lastLoginAt === null || onboardingCompletedAt === null;
}
