"use client";

import { useState } from "react";

export default function CreateCertificate() {
  const [formData, setFormData] = useState({
    legalName: "",
    siret: "",
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

    console.log("Envoi des données à l'API...", formData);

    try {
      const response = await fetch("/api/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
          <p className="text-gray-400 mb-6">Votre entité a été enregistrée avec succès.</p>
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
        <p className="text-gray-400 mb-8">Remplissez les informations de votre entité</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom légal *</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@entreprise.fr"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Site web</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="www.votresite.fr"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez votre activité..."
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