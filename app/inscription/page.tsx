"use client";

import { useState } from "react";

export default function InscriptionPage() {
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
    siret: "",
  });
  const [accountType, setAccountType] = useState<"business" | "individual">("business");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          name:
            accountType === "business"
              ? formData.name
              : `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          company: formData.company,
          siret: formData.siret,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Erreur de connexion au serveur");
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inscription envoyée !</h1>
          <p className="text-gray-600 mb-6">
            Votre demande est en attente de validation par un administrateur. Vous recevrez un email une fois votre
            compte activé.
          </p>
          <a href="/login" className="text-cyan-600 hover:underline">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">BlockTrust</h1>
          <p className="mt-2 text-gray-600">Créez votre compte professionnel</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setAccountType("business")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                accountType === "business"
                  ? "bg-white text-cyan-600 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🏢 Professionnel
            </button>
            <button
              type="button"
              onClick={() => setAccountType("individual")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                accountType === "individual"
                  ? "bg-white text-cyan-600 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              👤 Particulier
            </button>
          </div>

          {accountType === "business" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(event) => setFormData({ ...formData, company: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET (optionnel)</label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(event) => setFormData({ ...formData, siret: event.target.value })}
                  placeholder="12345678901234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du responsable
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Envoi en cours..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Déjà un compte ?{" "}
          <a href="/login" className="text-cyan-600 hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
