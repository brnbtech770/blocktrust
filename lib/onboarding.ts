// lib/onboarding.ts
// Contenu et clés localStorage — assistant onboarding dashboard
// ============================================================

export const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/bemcnlbifffejlijnndkdgcjpmijfaeg";

export type OnboardingStepId =
  | "welcome"
  | "badge"
  | "extension"
  | "contacts"
  | "trust-circle"
  | "trustscore"
  | "bis"
  | "domains"
  | "vault"
  | "kyc"
  | "finish"
  | "mcp"
  | "extensions-api";

export type OnboardingFeature =
  | "bis"
  | "trust-circle"
  | "extension"
  | "vault"
  | "trustscore";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string;
  extraInfo?: string[];
  useCase?: string;
  useCases?: string[];
  practicalSteps?: string[];
  bullets?: { label: string; description: string }[];
  checklist?: string[];
  tools?: string[];
  highlightTarget?: string;
  linkHref?: string;
  linkLabel?: string;
  planNote?: string;
  externalHref?: string;
  externalLabel?: string;
};

export type EncyclopediaEntry = {
  icon: string;
  label: string;
  stepId: OnboardingStepId;
};

export const ONBOARDING_AUTO_DISMISS_KEY = "bt_onboarding_auto_dismissed";

export function onboardingFeatureSeenKey(feature: OnboardingFeature): string {
  return `bt_onboarding_seen_${feature}`;
}

/** Page dashboard où le tooltip ne doit pas renvoyer vers lui-même. */
export const ONBOARDING_FEATURE_PATH: Record<OnboardingFeature, string> = {
  bis: "/dashboard/bis",
  "trust-circle": "/dashboard/trust-circle",
  extension: "/dashboard/extension",
  vault: "/dashboard/vault",
  trustscore: "/dashboard",
};

/** Étape encyclopédie de l'assistant pour ouverture depuis un tooltip. */
export const ONBOARDING_FEATURE_ENCYCLOPEDIA_STEP: Record<
  OnboardingFeature,
  OnboardingStepId
> = {
  bis: "bis",
  "trust-circle": "trust-circle",
  extension: "extensions-api",
  vault: "vault",
  trustscore: "trustscore",
};

export function isOnboardingFeaturePage(
  pathname: string,
  feature: OnboardingFeature,
): boolean {
  const base = ONBOARDING_FEATURE_PATH[feature];
  if (feature === "trustscore") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  return pathname === base || pathname.startsWith(`${base}/`);
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
    linkLabel: "Guide Trust Circle",
  },
  extension: {
    message:
      "Générez votre clé API et installez l'extension pour protéger vos emails dans Gmail.",
    linkHref: "/dashboard/extension",
    linkLabel: "Ouvrir Extensions",
  },
  vault: {
    message:
      "Coffre-fort sécurisé. Stockez vos RIB pour détecter les fraudes au faux virement.",
    linkHref: "/dashboard/vault",
    linkLabel: "Ouvrir le Vault",
  },
  trustscore: {
    message:
      "Votre score de confiance. Plus vous utilisez BLOCKTRUST, plus il monte.",
    linkHref: "/dashboard#trustscore-section",
    linkLabel: "Voir mon TrustScore",
  },
};

export const ONBOARDING_TOUR_STEP_IDS: OnboardingStepId[] = [
  "welcome",
  "badge",
  "extension",
  "contacts",
  "trust-circle",
  "trustscore",
  "bis",
  "domains",
  "vault",
  "kyc",
  "finish",
];

export const ONBOARDING_ENCYCLOPEDIA: EncyclopediaEntry[] = [
  { icon: "📌", label: "Mon badge certifié", stepId: "badge" },
  { icon: "🧩", label: "Extension Chrome TrustScan", stepId: "extension" },
  { icon: "👥", label: "Mes contacts", stepId: "contacts" },
  { icon: "🛡️", label: "Trust Circle", stepId: "trust-circle" },
  { icon: "📊", label: "TrustScore & Trust Graph", stepId: "trustscore" },
  { icon: "✍️", label: "Signatures BIS", stepId: "bis" },
  { icon: "🌐", label: "Protection domaines & sites web", stepId: "domains" },
  { icon: "🔐", label: "Vault (coffre-fort)", stepId: "vault" },
  { icon: "🪪", label: "KYC", stepId: "kyc" },
  { icon: "🤖", label: "MCP & Agents IA", stepId: "mcp" },
  { icon: "⚙️", label: "Extensions & API", stepId: "extensions-api" },
];

export const ONBOARDING_STEP_CONTENT: Record<OnboardingStepId, OnboardingStep> = {
  welcome: {
    id: "welcome",
    title: "Bienvenue sur BLOCKTRUST™",
    body: "BLOCKTRUST™ est votre infrastructure de confiance numérique. On certifie votre identité, on protège vos interactions, et on vous aide à vérifier à qui vous avez affaire — avant de répondre, signer ou payer.",
    extraInfo: [
      "Nous protégeons les personnes, les entreprises, les emails, les documents, les domaines et les sites web contre l'usurpation et la fraude.",
    ],
  },
  badge: {
    id: "badge",
    title: "Votre badge certifié",
    body: "Votre badge est votre identité numérique vérifiable. Il contient votre nom, votre email certifié, et un ancrage cryptographique sur la blockchain Polygon (plans payants). Tout le monde peut le vérifier — même sans compte BLOCKTRUST.",
    useCase:
      "Vous êtes agent immobilier. Vous ajoutez votre lien de vérification dans votre signature email. Chaque client peut vérifier en un clic que vous êtes bien qui vous prétendez être — pas un usurpateur.",
    practicalSteps: [
      "Allez dans votre Dashboard → votre badge est déjà actif",
      "Copiez votre lien de vérification (permanent ou code rotatif)",
      "Ajoutez-le dans votre signature email, site web, réseaux sociaux",
      "Partagez le QR code pour les rencontres en personne",
    ],
    extraInfo: [
      "Les codes rotatifs : par défaut, votre lien utilise un code qui change périodiquement — plus sécurisé contre le tracking. Vous pouvez aussi utiliser le lien permanent si vous préférez.",
    ],
    highlightTarget: "badge-section",
    linkHref: "/dashboard",
    linkLabel: "Voir mon badge",
  },
  extension: {
    id: "extension",
    title: "Protégez vos emails avec TrustScan",
    body: "Installez l'extension Chrome ou Outlook selon votre messagerie. Générez votre clé API dans Extensions, puis vérifiez vos correspondants automatiquement.",
    bullets: [
      { label: "Chrome (Gmail)", description: "badge vert ou gris à côté de chaque expéditeur" },
      { label: "Outlook", description: "même protection dans Microsoft 365 / Outlook Web" },
      { label: "Clé API", description: "Dashboard → Extensions → Générer ma clé API" },
      { label: "Sélectif", description: "bouton ✓ BIS dans le composeur (mode recommandé)" },
    ],
    useCase:
      "Vous recevez un email de votre banque vous demandant de mettre à jour vos coordonnées. Badge vert → c'est bien votre banque. Badge gris → méfiance, c'est peut-être du phishing. Si votre contact signe habituellement avec BIS mais que cet email n'est PAS signé → alerte de compromission.",
    practicalSteps: [
      "Dashboard → Extensions → Générer ma clé API → Copier",
      "Chrome : installer TrustScan depuis le Web Store, coller la clé dans Gmail",
      "Outlook : installer le complément BLOCKTRUST, coller la même clé API",
      "Les badges apparaissent dans votre messagerie",
      "Options de l'extension → choisissez votre mode BIS (Sélectif recommandé)",
    ],
    externalHref: CHROME_WEB_STORE_URL,
    externalLabel: "Installer TrustScan",
    linkHref: "/dashboard/extension",
    linkLabel: "Configurer l'extension",
  },
  contacts: {
    id: "contacts",
    title: "Gérez vos contacts de confiance",
    body: "Ajoutez vos contacts pour suivre leur statut de certification et construire votre réseau de confiance.",
    bullets: [
      {
        label: "Contact simple",
        description:
          "vous le référencez dans votre réseau. Il apparaît dans votre liste mais n'a pas forcément de compte BLOCKTRUST.",
      },
      {
        label: "Contact vérifié",
        description:
          "il est certifié BLOCKTRUST™. Son badge est actif et ses interactions sont vérifiables.",
      },
      {
        label: "Contact Trust Circle",
        description: "confiance réciproque vérifiée (voir l'étape Trust Circle).",
      },
    ],
    useCase:
      "Vous êtes notaire. Vous ajoutez vos clients, confrères et partenaires dans Gmail ou Outlook. Quand un client vous envoie un document, vous voyez immédiatement s'il est certifié.",
    extraInfo: ["Vous pouvez supprimer un contact à tout moment."],
    linkHref: "/dashboard/entities",
    linkLabel: "Gérer mes contacts",
  },
  "trust-circle": {
    id: "trust-circle",
    title: "Votre cercle de confiance",
    body: "Le Trust Circle est votre réseau fermé de contacts vérifiés. Contrairement aux contacts simples, le Trust Circle établit des relations de confiance cryptographiquement prouvées.",
    bullets: [
      {
        label: "Mutuelle",
        description:
          "les DEUX parties se sont ajoutées mutuellement. Niveau le plus fort. Badge vert « Contact mutuel certifié ».",
      },
      {
        label: "Unilatérale",
        description: "VOUS avez ajouté le contact mais il ne vous a pas encore ajouté. Statut « En attente ».",
      },
      {
        label: "Manuelle",
        description: "ajout sans vérification (contacts sans compte BLOCKTRUST).",
      },
    ],
    extraInfo: [
      "Pourquoi c'est puissant : le Trust Circle n'est pas un simple carnet d'adresses. Chaque relation est PROUVÉE. Quand quelqu'un est dans votre Trust Circle : son TrustScore enrichit le vôtre, ses interactions sont marquées « réseau de confiance », l'extension affiche « Dans votre réseau », et toute anomalie (email non signé d'un contact qui signe d'habitude) déclenche une alerte.",
    ],
    useCase:
      "Vous travaillez avec un cabinet d'avocats. Relation mutuelle établie. Vous recevez un email avec un RIB → le Trust Circle CONFIRME que c'est bien eux. Un escroc usurpe l'email du cabinet → il ne sera PAS dans votre Trust Circle → alerte immédiate.",
    planNote: "Disponible à partir du plan Premium.",
    linkHref: "/dashboard/trust-circle",
    linkLabel: "Ouvrir le Trust Circle",
  },
  trustscore: {
    id: "trustscore",
    title: "Votre score et réseau de confiance",
    body: "Le TrustScore est une note sur 100 qui reflète votre niveau de confiance numérique. Il est calculé automatiquement à partir de 4 dimensions.",
    bullets: [
      { label: "Identité (40 %)", description: "KYC vérifié, email confirmé, ancienneté du compte" },
      {
        label: "Réseau (30 %)",
        description: "taille du Trust Circle, contacts mutuels certifiés",
      },
      {
        label: "Comportement (20 %)",
        description: "signatures BIS, interactions vérifiées, pas de signalements",
      },
      {
        label: "Technique (10 %)",
        description: "ancrage blockchain, âge du domaine, SPF/DKIM",
      },
    ],
    extraInfo: [
      "Le Trust Graph est le réseau invisible qui relie tous les utilisateurs BLOCKTRUST. Quand vous vérifiez quelqu'un, le graph prend en compte non seulement ses propres signaux mais aussi ceux de ses contacts certifiés. La confiance se propage dans le réseau — les concurrents vérifient l'identité, BLOCKTRUST vérifie la CONFIANCE.",
    ],
    practicalSteps: [
      "Vérifiez votre identité (KYC) → +20 à 30 points",
      "Faites ancrer votre badge blockchain → +10 points",
      "Ajoutez des contacts au Trust Circle → +5 points par mutuel",
      "Signez vos interactions avec BIS → +2 points par signature",
      "Maintenez un historique propre → score stable dans le temps",
    ],
    useCase:
      "Vous êtes freelance sur une marketplace. Votre TrustScore de 85/100 rassure vos clients — identité vérifiée, réseau actif, interactions signées. Un concurrent à 15/100 inspire moins confiance.",
    highlightTarget: "trustscore-section",
    linkHref: "/verify",
    linkLabel: "Page de vérification publique",
  },
  bis: {
    id: "bis",
    title: "Signez vos interactions",
    body: "BIS (BlockTrust Interaction Signature) est une signature cryptographique infalsifiable. Elle prouve que VOUS avez envoyé un email ou un document — et que le contenu n'a pas été modifié.",
    bullets: [
      { label: "EMAIL", description: "prouve que l'email vient bien de vous" },
      { label: "DOCUMENT", description: "prouve que le fichier n'a pas été altéré (hash SHA-256)" },
      { label: "CONTRAT", description: "signature contractuelle vérifiable" },
      { label: "PAIEMENT", description: "preuve d'un ordre de paiement" },
      { label: "MARKETPLACE", description: "preuve d'une transaction" },
    ],
    extraInfo: [
      "3 façons de signer : extension Chrome (automatique), extension Chrome (sélectif — bouton ✓ BIS dans Gmail), dashboard BIS (documents et cas spéciaux).",
      "Pour les documents : seule l'empreinte SHA-256 est enregistrée — le fichier ne quitte JAMAIS votre appareil.",
      "Le destinataire reçoit un email BLOCKTRUST avec un lien de vérification — même sans compte BLOCKTRUST.",
    ],
    useCase:
      "Vous envoyez un contrat de vente. Vous signez avec BIS. Le client reçoit le contrat + la notification BLOCKTRUST. Il clique « Vérifier » → c'est bien vous, et le contrat n'a pas été modifié. Si quelqu'un intercepte l'email et modifie le contrat → la vérification échoue → fraude détectée.",
    linkHref: "/dashboard/bis",
    linkLabel: "Signer avec BIS",
  },
  domains: {
    id: "domains",
    title: "Protégez votre domaine contre les sites miroirs",
    body: "BLOCKTRUST protège votre nom de domaine et votre site web contre le phishing et les sites miroirs. Nous détectons automatiquement les domaines qui imitent le vôtre pour tromper vos clients.",
    bullets: [
      {
        label: "Typosquatting",
        description:
          "analyse des domaines similaires (ex. bl0cktrust.tech — o remplacé par 0). Levenshtein + homoglyphes.",
      },
      {
        label: "Vérification de domaine",
        description:
          "quiconque vérifie votre domaine voit que VOUS êtes le propriétaire certifié. Un site miroir ne pourra pas le prouver.",
      },
      {
        label: "Réputation",
        description: "âge du domaine (RDAP), SPF/DKIM/DMARC, certificats SSL, niveau de risque global.",
      },
    ],
    useCases: [
      "Protection de votre site : un escroc crée cabinet-dup0nt.fr (zéro au lieu de o). BLOCKTRUST détecte le typosquatting et alerte : « ATTENTION — domaine similaire détecté ».",
      "Vérification avant de cliquer : vous vérifiez le domaine d'un fournisseur. Domaine créé hier, pas de SPF, ressemble à un domaine certifié → ALERTE. Phishing évité.",
      "Pour les entreprises : certifiez votre domaine. Vos clients vérifient que votre site est authentique — pas une copie.",
    ],
    practicalSteps: [
      "Votre domaine est automatiquement lié à votre certificat",
      "Via l'extension Chrome : les domaines suspects sont signalés",
      "Via le MCP : les agents IA vérifient les domaines automatiquement",
      "Via le dashboard : section contacts → domaines vérifiés",
    ],
    tools: [
      "verify_domain : vérifie si un domaine est certifié BLOCKTRUST",
      "verify_website : détecte phishing et typosquatting",
      "check_domain_reputation : analyse complète (RDAP, SPF, risque)",
    ],
    linkHref: "/verify",
    linkLabel: "Vérifier un domaine",
  },
  vault: {
    id: "vault",
    title: "Votre coffre-fort de données sensibles",
    body: "Le Vault stocke vos données sensibles de manière sécurisée : RIB, IBAN, numéros de contrat, clés. Il sert aussi de RÉFÉRENCE pour détecter les fraudes.",
    extraInfo: [
      "Détection de fraude au faux RIB : stockez le RIB de vos fournisseurs dans le Vault. Quand vous recevez un « nouveau RIB », comparez-le avec la référence. Si les numéros ne correspondent pas → ALERTE FRAUDE. Protection n°1 contre l'arnaque au faux RIB.",
    ],
    bullets: [
      { label: "Types stockables", description: "CONTACT, DOMAIN, EMAIL, PHONE, URL, WALLET" },
    ],
    useCase:
      "Votre comptable reçoit un email du fournisseur habituel avec un nouveau RIB. Il vérifie dans le Vault : le RIB reçu ne correspond PAS à la référence. ALERTE → la boîte email du fournisseur a été compromise. Virement frauduleux évité.",
    planNote: "Disponible à partir du plan Premium ou B2B.",
    linkHref: "/dashboard/vault",
    linkLabel: "Ouvrir le Vault",
  },
  kyc: {
    id: "kyc",
    title: "Renforcez votre certification",
    body: "La vérification d'identité confirme votre identité avec une pièce officielle via Stripe Identity. C'est ce qui fait passer votre badge de « déclaré » à « certifié ».",
    bullets: [
      { label: "Déclaré (orange)", description: "email vérifié, pas de vérification d'identité" },
      { label: "Vérifié (vert)", description: "identité confirmée" },
      { label: "Ancré (vert + blockchain)", description: "certificat ancré sur Polygon" },
    ],
    useCase:
      "Sans vérification d'identité, votre badge indique « identité déclarée » — badge orange. Après validation, votre pièce d'identité confirme qui vous êtes → badge vert « Certifié BLOCKTRUST™ ». Confiance formelle.",
    planNote: "Disponible à partir du plan Essentiel.",
    linkHref: "/onboarding/verify",
    linkLabel: "Vérifier mon identité",
  },
  finish: {
    id: "finish",
    title: "Vous êtes prêt !",
    body: "Vous connaissez maintenant toutes les fonctionnalités BLOCKTRUST™.",
    checklist: [
      "Installer l'extension Chrome",
      "Partager votre badge avec vos contacts",
      "Ajouter vos premiers contacts",
      "Signer votre première interaction BIS",
      "Vérifier un domaine suspect",
    ],
    extraInfo: [
      "Le guide est toujours disponible via le bouton ? en bas à droite de votre dashboard.",
    ],
  },
  mcp: {
    id: "mcp",
    title: "MCP & Agents IA",
    body: "Pour les développeurs et les agents IA : BLOCKTRUST expose 15 outils via le protocole MCP. Vos agents peuvent vérifier des identités, détecter du phishing, signer des interactions et chercher dans le Vault — automatiquement.",
    tools: [
      "verify_identity — vérifier un badge ou certificat",
      "verify_domain / verify_website — détecter phishing et typosquatting",
      "sign_bis — signer une interaction",
      "vault_search — chercher dans le coffre-fort",
    ],
    extraInfo: [
      "Documentation complète et configuration : blocktrust.tech/mcp",
    ],
    linkHref: "/mcp",
    linkLabel: "Documentation MCP",
  },
  "extensions-api": {
    id: "extensions-api",
    title: "Extensions & API",
    body: "Connectez BLOCKTRUST à vos outils : extension Chrome TrustScan (Gmail), extension Outlook, clé API extension, API publique et intégrations White Label.",
    practicalSteps: [
      "Chrome : installez TrustScan et générez votre clé API",
      "Outlook : connectez votre compte depuis le taskpane",
      "API extension : dashboard → Extensions → Générer ma clé API",
      "White Label : dashboard → API publique (plans B2B)",
    ],
    externalHref: CHROME_WEB_STORE_URL,
    externalLabel: "Chrome Web Store — TrustScan",
    linkHref: "/dashboard/extension",
    linkLabel: "Configurer les extensions",
  },
};

/** Étapes du parcours guidé séquentiel (11). */
export const ONBOARDING_STEPS: OnboardingStep[] = ONBOARDING_TOUR_STEP_IDS.map(
  (id) => ONBOARDING_STEP_CONTENT[id],
);

export function getOnboardingStep(id: OnboardingStepId): OnboardingStep {
  return ONBOARDING_STEP_CONTENT[id];
}

export function shouldAutoOpenOnboarding(
  onboardingCompletedAt: string | null,
  lastLoginAt: string | null,
  autoDismissed: boolean,
): boolean {
  if (autoDismissed || onboardingCompletedAt) return false;
  return lastLoginAt === null || onboardingCompletedAt === null;
}
