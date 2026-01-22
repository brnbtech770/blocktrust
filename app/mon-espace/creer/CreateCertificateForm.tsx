"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateCertificateFormProps {
  userId: string;
}

export default function CreateCertificateForm({
  userId,
}: CreateCertificateFormProps) {
  const router = useRouter();
  const [entityType, setEntityType] = useState<"BUSINESS" | "INDIVIDUAL">(
    "BUSINESS"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    legalName: "",
    siret: "",
    firstName: "",
    lastName: "",
    email: "",
    website: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/client/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/mon-espace");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-white font-semibold mb-2">
          Certificat créé avec succès !
        </h3>
        <p className="text-gray-400 text-sm">Redirection en cours...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-3">
          Type d&apos;entité
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setEntityType("BUSINESS")}
            className={`p-4 rounded-lg border-2 transition-all ${
              entityType === "BUSINESS"
                ? "border-cyan-500 bg-cyan-900/20"
                : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
            }`}
          >
            <svg
              className={`w-8 h-8 mx-auto mb-2 ${
                entityType === "BUSINESS" ? "text-cyan-400" : "text-gray-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span
              className={`block font-medium ${
                entityType === "BUSINESS" ? "text-white" : "text-gray-300"
              }`}
            >
              Entreprise
            </span>
            <span className="text-gray-400 text-xs">SIRET requis</span>
          </button>

          <button
            type="button"
            onClick={() => setEntityType("INDIVIDUAL")}
            className={`p-4 rounded-lg border-2 transition-all ${
              entityType === "INDIVIDUAL"
                ? "border-cyan-500 bg-cyan-900/20"
                : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
            }`}
          >
            <svg
              className={`w-8 h-8 mx-auto mb-2 ${
                entityType === "INDIVIDUAL" ? "text-cyan-400" : "text-gray-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span
              className={`block font-medium ${
                entityType === "INDIVIDUAL" ? "text-white" : "text-gray-300"
              }`}
            >
              Particulier
            </span>
            <span className="text-gray-400 text-xs">Personne physique</span>
          </button>
        </div>
      </div>

      {entityType === "BUSINESS" ? (
        <>
          <div>
            <label
              htmlFor="legalName"
              className="block text-gray-300 text-sm font-medium mb-2"
            >
              Raison sociale *
            </label>
            <input
              type="text"
              id="legalName"
              name="legalName"
              value={formData.legalName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="BRNB TECH SASU"
            />
          </div>

          <div>
            <label
              htmlFor="siret"
              className="block text-gray-300 text-sm font-medium mb-2"
            >
              SIRET *
            </label>
            <input
              type="text"
              id="siret"
              name="siret"
              value={formData.siret}
              onChange={handleChange}
              required
              pattern="[0-9]{14}"
              maxLength={14}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="12345678901234"
            />
            <p className="text-gray-500 text-xs mt-1">
              14 chiffres sans espaces
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-gray-300 text-sm font-medium mb-2"
              >
                Prénom *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Jean"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-gray-300 text-sm font-medium mb-2"
              >
                Nom *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Dupont"
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-gray-300 text-sm font-medium mb-2"
        >
          Email de contact *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
          placeholder="contact@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="website"
          className="block text-gray-300 text-sm font-medium mb-2"
        >
          Site web
        </label>
        <input
          type="url"
          id="website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
          placeholder="https://www.example.com"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-gray-300 text-sm font-medium mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          placeholder="Décrivez votre activité..."
        />
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-4 pt-4">
        <a
          href="/mon-espace"
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
        >
          Annuler
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Création...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Créer le certificat
            </>
          )}
        </button>
      </div>
    </form>
  );
}
