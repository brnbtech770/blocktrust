/**
 * Client INSEE Sirene 3.11 — vérification des SIRET d'entreprises françaises.
 *
 * Authentification : OAuth2 Client Credentials.
 * Doc : https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=3.11&provider=insee
 *
 * NE JAMAIS logger les credentials (consumer key/secret ni access_token).
 */

const INSEE_TOKEN_URL = "https://api.insee.fr/token";
const INSEE_SIRENE_URL = "https://api.insee.fr/api-sirene/3.11";

/** Marge de sécurité avant expiration du token (en secondes). */
const TOKEN_EXPIRY_MARGIN = 60;

type CachedToken = {
  token: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

/**
 * Récupère un token OAuth2 (cache mémoire avec marge d'expiration).
 * Lance une erreur générique si l'auth échoue — n'expose jamais les creds.
 */
export async function getInseeToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - TOKEN_EXPIRY_MARGIN > now) {
    return cachedToken.token;
  }

  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("INSEE credentials missing");
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );

  const response = await fetch(INSEE_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("INSEE auth failed");
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
  };

  if (!data.access_token) {
    throw new Error("INSEE auth: no access_token in response");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 600;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresIn,
  };

  return cachedToken.token;
}

/** Donnée structurée renvoyée par `verifySiret`. */
export type SiretCheckResult =
  | {
      valid: true;
      siret: string;
      siren: string;
      raisonSociale: string;
      adresse: string;
      activite?: string;
      dateCreation?: string;
      etatAdministratif: "Actif" | "Fermé";
      raw?: Record<string, unknown>;
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Vérifie un SIRET via l'API Sirene 3.11.
 * Retourne `{ valid: false, error }` plutôt que de throw, pour permettre une
 * gestion gracieuse côté API route.
 */
export async function verifySiret(siret: string): Promise<SiretCheckResult> {
  const cleanSiret = (siret ?? "").replace(/\s/g, "");

  if (!/^\d{14}$/.test(cleanSiret)) {
    return { valid: false, error: "Format SIRET invalide (14 chiffres requis)" };
  }

  let token: string;
  try {
    token = await getInseeToken();
  } catch {
    return { valid: false, error: "API INSEE indisponible (authentification)" };
  }

  let response: Response;
  try {
    response = await fetch(`${INSEE_SIRENE_URL}/siret/${cleanSiret}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return { valid: false, error: "Erreur réseau INSEE" };
  }

  if (response.status === 404) {
    return { valid: false, error: "SIRET introuvable" };
  }
  if (response.status === 401 || response.status === 403) {
    cachedToken = null;
    return { valid: false, error: "API INSEE : autorisation refusée" };
  }
  if (!response.ok) {
    return { valid: false, error: "Erreur vérification SIRET" };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { valid: false, error: "Réponse INSEE invalide" };
  }

  return parseSiretResponse(cleanSiret, data);
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

type EtablissementShape = {
  siret?: string;
  siren?: string;
  dateCreationEtablissement?: string;
  uniteLegale?: {
    denominationUniteLegale?: string;
    prenomUsuelUniteLegale?: string;
    prenom1UniteLegale?: string;
    nomUniteLegale?: string;
  };
  adresseEtablissement?: {
    numeroVoieEtablissement?: string;
    indiceRepetitionEtablissement?: string;
    typeVoieEtablissement?: string;
    libelleVoieEtablissement?: string;
    codePostalEtablissement?: string;
    libelleCommuneEtablissement?: string;
    codePaysEtrangerEtablissement?: string;
  };
  periodesEtablissement?: Array<{
    etatAdministratifEtablissement?: string;
    activitePrincipaleEtablissement?: string;
    dateFin?: string | null;
  }>;
};

function parseSiretResponse(siret: string, raw: unknown): SiretCheckResult {
  const root = raw as { etablissement?: EtablissementShape } | undefined;
  const etab = root?.etablissement;
  if (!etab) {
    return { valid: false, error: "Réponse INSEE incomplète" };
  }

  const ul = etab.uniteLegale ?? {};

  const denom = ul.denominationUniteLegale?.trim();
  const personneNom = [ul.prenomUsuelUniteLegale ?? ul.prenom1UniteLegale, ul.nomUniteLegale]
    .filter(Boolean)
    .join(" ")
    .trim();
  const raisonSociale = denom || personneNom || "—";

  const addr = etab.adresseEtablissement ?? {};
  const adresse = [
    [addr.numeroVoieEtablissement, addr.indiceRepetitionEtablissement]
      .filter(Boolean)
      .join(""),
    addr.typeVoieEtablissement,
    addr.libelleVoieEtablissement,
    addr.codePostalEtablissement,
    addr.libelleCommuneEtablissement,
  ]
    .filter((s): s is string => Boolean(s && String(s).trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // Période courante = celle dont dateFin est null (la plus récente).
  const currentPeriod =
    etab.periodesEtablissement?.find((p) => p.dateFin === null) ??
    etab.periodesEtablissement?.[0];

  const etatAdministratif: "Actif" | "Fermé" =
    currentPeriod?.etatAdministratifEtablissement === "A" ? "Actif" : "Fermé";

  return {
    valid: true,
    siret: etab.siret ?? siret,
    siren: etab.siren ?? siret.slice(0, 9),
    raisonSociale,
    adresse,
    activite: currentPeriod?.activitePrincipaleEtablissement,
    dateCreation: etab.dateCreationEtablissement,
    etatAdministratif,
  };
}

/** Pour les tests : invalide le cache du token (à éviter en prod). */
export function __resetInseeTokenCache() {
  cachedToken = null;
}
