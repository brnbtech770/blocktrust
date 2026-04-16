"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import { UpgradePrompt } from "@/app/components/ui/UpgradePrompt";
import { buildUpgradePromptProps } from "@/lib/upgradePromptProps";

type EntityType = "INDIVIDUAL" | "BUSINESS";

// Schémas de validation Zod
const individualSchema = z.object({
  entityType: z.literal("INDIVIDUAL"),
  firstName: z.string().min(1, "Le prénom est requis").max(100),
  lastName: z.string().min(1, "Le nom est requis").max(100),
  email: z.string().email("Email invalide"),
  phone: z.string().optional().nullable(),
  website: z.string().max(500).optional().nullable().or(z.literal("")),
  description: z.string().max(1000).optional().nullable(),
});

const businessSchema = z.object({
  entityType: z.literal("BUSINESS"),
  legalName: z.string().min(1, "Le nom légal est requis").max(255),
  tradeName: z.string().max(255).optional().nullable(),
  siret: z.string().length(14, "Le SIRET doit contenir exactement 14 chiffres").regex(/^\d{14}$/, "Le SIRET ne doit contenir que des chiffres"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional().nullable(),
  website: z.string().url("URL invalide"), // Requis pour BUSINESS
  description: z.string().max(1000).optional().nullable(),
});

type IndividualData = z.infer<typeof individualSchema>;
type BusinessData = z.infer<typeof businessSchema>;

/** SIRET : uniquement des chiffres, max 14 (espaces et autres caractères retirés à la saisie). */
function normalizeSiretInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 14);
}

export default function CreateCertificate() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [entityType, setEntityType] = useState<EntityType>("BUSINESS");
  
  // Formulaire B2C (Particulier)
  const [individualData, setIndividualData] = useState<Partial<IndividualData>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    website: "",
    description: "",
  });

  // Formulaire B2B (Entreprise)
  const [businessData, setBusinessData] = useState<Partial<BusinessData>>({
    legalName: "",
    tradeName: "",
    siret: "",
    email: "",
    phone: "",
    website: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdEntity, setCreatedEntity] = useState<any>(null);
  const [createdCertificate, setCreatedCertificate] = useState<any>(null);
  const [certQuota, setCertQuota] = useState<{
    allowed: boolean;
    plan: string;
    max: number;
  } | null>(null);

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/quota/certificates", { credentials: "include" });
        if (!r.ok) {
          if (!cancelled) {
            setCertQuota({ allowed: true, plan: "ESSENTIEL", max: 1 });
          }
          return;
        }
        const d = await r.json();
        if (!cancelled) {
          setCertQuota({
            allowed: d.allowed,
            plan: d.plan,
            max: d.max,
          });
        }
      } catch {
        if (!cancelled) {
          setCertQuota({ allowed: true, plan: "ESSENTIEL", max: 1 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  // Normaliser le website (ajouter https:// si manquant)
  const normalizeWebsite = (website: string | undefined | null): string | null => {
    if (!website || website.trim() === "") return null;
    const trimmed = website.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Validation de l'étape 1
  const validateStep1 = (): boolean => {
    setError("");
    try {
      if (entityType === "INDIVIDUAL") {
        individualSchema.parse({
          entityType: "INDIVIDUAL",
          ...individualData,
        });
      } else {
        // Nettoyer le SIRET (enlever les espaces)
        const siretClean = businessData.siret?.replace(/\s/g, "") || "";
        // Normaliser le website pour la validation
        const websiteNormalized = normalizeWebsite(businessData.website);
        businessSchema.parse({
          entityType: "BUSINESS",
          ...businessData,
          siret: siretClean,
          website: websiteNormalized,
        });
      }
      return true;
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const issues = (err as { issues?: Array<{ message?: string }> }).issues;
        const firstError = issues?.[0];
        setError(firstError?.message || "Veuillez corriger les erreurs du formulaire");
      } else {
        setError("Erreur de validation");
      }
      return false;
    }
  };

  // Passer à l'étape 2 (récapitulatif)
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Générer le certificat (étape 2)
  const handleGenerateCertificate = async () => {
    setLoading(true);
    setError("");

    try {
      // Préparer les données selon le type
      let entityPayload: any;

      if (entityType === "INDIVIDUAL") {
        entityPayload = {
          entityType: "INDIVIDUAL",
          firstName: individualData.firstName,
          lastName: individualData.lastName,
          email: individualData.email,
          phone: individualData.phone || null,
          website: individualData.website || null,
          description: individualData.description || null,
        };
      } else {
        // Nettoyer le SIRET
        const siretClean = businessData.siret?.replace(/\s/g, "") || "";
        // Normaliser le website (l'API le fera aussi, mais on le fait ici pour être sûr)
        const websiteNormalized = normalizeWebsite(businessData.website);
        entityPayload = {
          entityType: "BUSINESS",
          legalName: businessData.legalName,
          tradeName: businessData.tradeName || null,
          siret: siretClean,
          email: businessData.email,
          phone: businessData.phone || null,
          website: websiteNormalized,
          description: businessData.description || null,
        };
      }

      // Étape 1 : Créer l'entité
      const entityResponse = await fetch("/api/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(entityPayload),
      });

      const entityResult = await entityResponse.json();

      if (!entityResponse.ok) {
        throw new Error(entityResult.error || "Erreur lors de la création de l'entité");
      }

      setCreatedEntity(entityResult.entity);

      // Étape 2 : Obtenir le certificat avec QR code
      // L'API /api/entities crée déjà un certificat automatiquement
      // On appelle /api/certificates pour obtenir le QR code (il retournera le certificat existant si déjà créé)
      const certResponse = await fetch("/api/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          entityId: entityResult.entity.id,
        }),
      });

      const certResult = await certResponse.json();

      if (!certResponse.ok) {
        throw new Error(certResult.error || "Erreur lors de la récupération du certificat");
      }

      setCreatedCertificate(certResult.certificate);
      
      // Rediriger vers le dashboard avec message de succès
      router.push("/dashboard?success=true&certificateCreated=true");
    } catch (err: any) {
      console.error("Erreur:", err);
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // Retour à l'étape 1
  const handleBack = () => {
    setStep(1);
    setError("");
  };

  // Données pour le récapitulatif
  const getSummaryData = () => {
    if (entityType === "INDIVIDUAL") {
      return {
        type: "Particulier",
        name: `${individualData.firstName} ${individualData.lastName}`,
        email: individualData.email,
        phone: individualData.phone || "Non renseigné",
        website: individualData.website || "Non renseigné",
        description: individualData.description || "Non renseigné",
      };
    } else {
      return {
        type: "Entreprise",
        legalName: businessData.legalName,
        tradeName: businessData.tradeName || "Non renseigné",
        siret: businessData.siret,
        email: businessData.email,
        phone: businessData.phone || "Non renseigné",
        website: businessData.website || "Non renseigné",
        description: businessData.description || "Non renseigné",
      };
    }
  };

  const summary = getSummaryData();

  return (
    <div className="min-h-screen bg-navy p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-4 inline-block font-sans text-sm font-medium text-bt-cyan/90 hover:text-bt-cyan"
        >
          ← Retour au dashboard
        </Link>

        <div className="mb-8">
          <h1 className="font-syne text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl mb-2">
            Créer un certificat
          </h1>
          <p className="mb-6 font-sans text-base leading-relaxed text-white/80">
            Remplissez les informations de votre entité
          </p>
          
          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-bt-cyan" : "text-white/40"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                step >= 1 ? "bg-bt-cyan text-navy" : "bg-white/10 text-white/50"
              }`}>
                1
              </div>
              <span className="font-medium">Informations</span>
            </div>
            <div className={`h-1 flex-1 ${step >= 2 ? "bg-bt-cyan" : "bg-white/10"}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-bt-cyan" : "text-white/40"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                step >= 2 ? "bg-bt-cyan text-navy" : "bg-white/10 text-white/50"
              }`}>
                2
              </div>
              <span className="font-medium">Récapitulatif</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleContinue} className="space-y-6">
            {/* Sélecteur de type */}
            <div className="mb-8">
              <label className="block text-base font-semibold text-gray-300 mb-3">
                Je suis un :
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setEntityType("INDIVIDUAL")}
                  className={`flex-1 rounded-lg px-6 py-3 font-sans font-medium transition ${
                    entityType === "INDIVIDUAL"
                      ? "bg-bt-cyan text-navy"
                      : "border border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                  }`}
                >
                  👤 Particulier
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType("BUSINESS")}
                  className={`flex-1 rounded-lg px-6 py-3 font-sans font-medium transition ${
                    entityType === "BUSINESS"
                      ? "bg-bt-cyan text-navy"
                      : "border border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                  }`}
                >
                  🏢 Entreprise
                </button>
              </div>
            </div>

            {entityType === "INDIVIDUAL" ? (
              <>
                {/* Formulaire Particulier */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-semibold text-gray-300 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={individualData.firstName || ""}
                      onChange={(e) =>
                        setIndividualData({ ...individualData, firstName: e.target.value })
                      }
                      placeholder="Jean"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-300 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={individualData.lastName || ""}
                      onChange={(e) =>
                        setIndividualData({ ...individualData, lastName: e.target.value })
                      }
                      placeholder="Dupont"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={individualData.email || ""}
                    onChange={(e) =>
                      setIndividualData({ ...individualData, email: e.target.value })
                    }
                    placeholder="jean.dupont@email.com"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={individualData.phone || ""}
                    onChange={(e) =>
                      setIndividualData({ ...individualData, phone: e.target.value })
                    }
                    placeholder="+33 6 12 34 56 78"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Site web / LinkedIn
                  </label>
                  <input
                    type="text"
                    value={individualData.website || ""}
                    onChange={(e) =>
                      setIndividualData({ ...individualData, website: e.target.value })
                    }
                    placeholder="www.linkedin.com/in/jeandupont ou www.monsite.fr"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={individualData.description || ""}
                    onChange={(e) =>
                      setIndividualData({ ...individualData, description: e.target.value })
                    }
                    placeholder="Décrivez votre activité professionnelle..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Formulaire Entreprise */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom légal *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.legalName || ""}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, legalName: e.target.value })
                    }
                    placeholder="Ex: BRNB TECH SAS"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom commercial
                  </label>
                  <input
                    type="text"
                    value={businessData.tradeName || ""}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, tradeName: e.target.value })
                    }
                    placeholder="Ex: BlockTrust"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SIRET * (14 chiffres)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    value={businessData.siret || ""}
                    onInput={(e) => {
                      const v = normalizeSiretInput(e.currentTarget.value);
                      setBusinessData({ ...businessData, siret: v });
                    }}
                    placeholder="12345678900014"
                    maxLength={14}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    14 chiffres uniquement — les espaces sont retirés automatiquement (ex. coller « 123 456 789 000 14 » devient 12345678900014).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email professionnel *
                  </label>
                  <input
                    type="email"
                    required
                    value={businessData.email || ""}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, email: e.target.value })
                    }
                    placeholder="contact@entreprise.fr"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={businessData.phone || ""}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, phone: e.target.value })
                    }
                    placeholder="+33 1 23 45 67 89"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Site web *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.website || ""}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, website: e.target.value })
                    }
                    placeholder="www.votresite.fr"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    L'URL sera automatiquement complétée avec https:// si nécessaire
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={businessData.description || ""}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, description: e.target.value })
                    }
                    placeholder="Décrivez votre activité..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-bt-cyan py-4 font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90"
            >
              Continuer →
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Récapitulatif */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
              <h2 className="font-syne mb-6 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Récapitulatif
              </h2>
              
              <div className="space-y-4">
                <div>
                  <span className="font-sans text-sm font-medium uppercase tracking-wider text-white/60">
                    Type d&apos;entité :
                  </span>
                  <p className="font-sans font-semibold text-white">{summary.type}</p>
                </div>

                {entityType === "INDIVIDUAL" ? (
                  <>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">Nom complet :</span>
                      <p className="text-white font-semibold">{summary.name}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">Nom légal :</span>
                      <p className="text-white font-semibold">{summary.legalName}</p>
                    </div>
                    {summary.tradeName !== "Non renseigné" && (
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Nom commercial :</span>
                        <p className="text-white font-semibold">{summary.tradeName}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 text-sm font-medium">SIRET :</span>
                      <p className="text-white font-semibold">{summary.siret}</p>
                    </div>
                  </>
                )}

                <div>
                  <span className="text-gray-400 text-sm font-medium">Email :</span>
                  <p className="text-white font-semibold">{summary.email}</p>
                </div>

                <div>
                  <span className="text-gray-400 text-sm font-medium">Téléphone :</span>
                  <p className="text-white">{summary.phone}</p>
                </div>

                <div>
                  <span className="text-gray-400 text-sm font-medium">Site web :</span>
                  <p className="text-white">{summary.website}</p>
                </div>

                <div>
                  <span className="text-gray-400 text-sm font-medium">Description :</span>
                  <p className="text-white">{summary.description}</p>
                </div>
              </div>
            </div>

            {certQuota && !certQuota.allowed ? (
              <UpgradePrompt
                {...buildUpgradePromptProps(certQuota.plan, certQuota.max)}
              />
            ) : null}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 rounded-lg border border-white/20 py-4 font-sans font-semibold text-white transition-all hover:border-white/40"
              >
                ← Retour
              </button>
              {certQuota && !certQuota.allowed ? null : (
                <button
                  type="button"
                  onClick={handleGenerateCertificate}
                  disabled={loading || certQuota === null}
                  className="flex-1 rounded-lg bg-bt-cyan py-4 font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90 disabled:opacity-50"
                >
                  {loading ? "⏳ Génération en cours..." : "🛡️ Générer mon certificat"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
