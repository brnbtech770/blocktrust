"use client";

import { useState } from "react";

export default function CreateCertificate() {
  const [entityType, setEntityType] = useState<"BUSINESS" | "INDIVIDUAL">("BUSINESS");
  const [formData, setFormData] = useState({
    legalName: "",
    siret: "",
    firstName: "",
    lastName: "",
    email: "",
    website: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      entityType,
      email: formData.email,
      website: formData.website,
      description: formData.description,
      ...(entityType === "BUSINESS"
        ? { legalName: formData.legalName, siret: formData.siret }
        : { firstName: formData.firstName, lastName: formData.lastName }),
    };

    console.log("Envoi des données à l'API...", payload);

    try {
      const response = await fetch("/api/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Réponse API:", data);

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Erreur:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-lg p-12 rounded-2xl border border-gray-700 text-center max-w-md">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-4">Demande envoyée !</h2>
          <p className="text-gray-400 mb-6">
            {entityType === "BUSINESS"
              ? "Votre entreprise a été enregistrée avec succès."
              : "Votre profil a été enregistré avec succès."}
          </p>
          <a href="/dashboard" className="inline-block bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg">
            Retour au dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/dashboard" className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
          ← Retour au dashboard
        </a>
        <h1 className="text-3xl font-bold text-white mb-2">Créer un certificat</h1>
        <p className="text-gray-400 mb-8">Remplissez les informations pour obtenir votre badge de confiance</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Sélecteur Type d'entité */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-3">Type de compte *</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setEntityType("BUSINESS")}
              className={`p-6 rounded-xl border-2 transition-all ${
                entityType === "BUSINESS"
                  ? "border-cyan-500 bg-cyan-500/20"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="text-4xl mb-2">🏢</div>
              <p className={`font-bold ${entityType === "BUSINESS" ? "text-cyan-400" : "text-white"}`}>
                Entreprise
              </p>
              <p className="text-gray-400 text-sm">B2B - Avec SIRET</p>
            </button>
            <button
              type="button"
              onClick={() => setEntityType("INDIVIDUAL")}
              className={`p-6 rounded-xl border-2 transition-all ${
                entityType === "INDIVIDUAL"
                  ? "border-cyan-500 bg-cyan-500/20"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="text-4xl mb-2">👤</div>
              <p className={`font-bold ${entityType === "INDIVIDUAL" ? "text-cyan-400" : "text-white"}`}>
                Particulier
              </p>
              <p className="text-gray-400 text-sm">B2C - Sans SIRET</p>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champs B2B (Entreprise) */}
          {entityType === "BUSINESS" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom de l'entreprise *</label>
                <input
                  type="text"
                  required
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  placeholder="Ex: BRNB TECH SAS"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SIRET *</label>
                <input
                  type="text"
                  required
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </>
          )}

          {/* Champs B2C (Particulier) */}
          {entityType === "INDIVIDUAL" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jean"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Champs communs */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={entityType === "BUSINESS" ? "contact@entreprise.fr" : "jean.dupont@email.com"}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Site web</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder={entityType === "BUSINESS" ? "www.votreentreprise.fr" : "www.monportfolio.com"}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={entityType === "BUSINESS" ? "Décrivez votre activité..." : "Décrivez-vous en quelques mots..."}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-4 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
          >
            {loading ? "⏳ Envoi en cours..." : "🚀 Soumettre ma demande"}
          </button>
        </form>
      </div>
    </div>
  );
}
