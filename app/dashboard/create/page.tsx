"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import Link from "next/link";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
          ← Retour au dashboard
        </Link>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Créer un certificat</h1>
          <p className="text-gray-400 text-base mb-6">Remplissez les informations de votre entité</p>
          
          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-cyan-400" : "text-gray-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= 1 ? "bg-cyan-500 text-white" : "bg-gray-700 text-gray-400"
              }`}>
                1
              </div>
              <span className="font-medium">Informations</span>
            </div>
            <div className={`flex-1 h-1 ${step >= 2 ? "bg-cyan-500" : "bg-gray-700"}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-cyan-400" : "text-gray-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= 2 ? "bg-cyan-500 text-white" : "bg-gray-700 text-gray-400"
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
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                    entityType === "INDIVIDUAL"
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  👤 Particulier
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType("BUSINESS")}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                    entityType === "BUSINESS"
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SIRET * (14 chiffres)
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.siret || ""}
                    onChange={(e) => {
                      // Formatage automatique : espaces tous les 3 chiffres
                      const value = e.target.value.replace(/\s/g, "");
                      const formatted = value.match(/.{1,3}/g)?.join(" ") || value;
                      setBusinessData({ ...businessData, siret: formatted });
                    }}
                    placeholder="123 456 789 00012"
                    maxLength={17} // 14 chiffres + 3 espaces
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le SIRET doit contenir exactement 14 chiffres
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-4 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Continuer →
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Récapitulatif */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Récapitulatif</h2>
              
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400 text-sm font-medium">Type d'entité :</span>
                  <p className="text-white font-semibold">{summary.type}</p>
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-700 text-white font-semibold py-4 rounded-lg hover:bg-gray-600 transition-all"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleGenerateCertificate}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-4 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
              >
                {loading ? "⏳ Génération en cours..." : "🛡️ Générer mon certificat"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
