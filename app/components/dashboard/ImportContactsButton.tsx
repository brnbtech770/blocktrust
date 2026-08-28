"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { contactsCsvTemplate, parseContactsCsv } from "@/lib/contacts-import";

export default function ImportContactsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    rows: number;
    invalid: number;
    duplicates: number;
  } | null>(null);
  const [csvData, setCsvData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const blob = new Blob([contactsCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-contacts-blocktrust.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(file: File) {
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsvData(text);
      setFileName(file.name);
      const parsed = parseContactsCsv(text);
      setPreview({
        rows: parsed.rows.length,
        invalid: parsed.invalid,
        duplicates: parsed.duplicates,
      });
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvData.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csvData }),
      });
      const data = (await res.json()) as {
        imported?: number;
        duplicates?: number;
        invalid?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Import impossible.");
        return;
      }
      setResult(
        `${data.imported ?? 0} contact(s) importé(s), ${data.duplicates ?? 0} doublon(s) ignoré(s), ${data.invalid ?? 0} ligne(s) invalide(s).`,
      );
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
      >
        <Upload className="h-4 w-4 shrink-0" aria-hidden />
        Importer des contacts
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-labelledby="import-contacts-title"
            className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#0d1f3c] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="import-contacts-title" className="font-syne text-lg font-bold text-white">
                Importer des contacts
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mb-4 text-sm text-white/55">
              Aucune invitation Trust Circle n&apos;est envoyée. Maximum 500 contacts par import.
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mb-4 text-sm font-semibold text-bt-cyan hover:underline"
            >
              Télécharger le modèle CSV
            </button>
            <label
              className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/20 px-4 py-6 text-center text-sm text-white/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) onFile(file);
              }}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                }}
              />
              {fileName ? (
                <span className="text-white/80">{fileName}</span>
              ) : (
                <span>Glissez un fichier CSV ou cliquez pour choisir</span>
              )}
            </label>
            {preview ? (
              <p className="mt-3 text-sm text-white/70">
                {preview.rows} contact{preview.rows > 1 ? "s" : ""} trouvé
                {preview.rows > 1 ? "s" : ""}
                {preview.duplicates > 0
                  ? `, ${preview.duplicates} doublon${preview.duplicates > 1 ? "s" : ""} ignoré${preview.duplicates > 1 ? "s" : ""}`
                  : ""}
                {preview.invalid > 0
                  ? `, ${preview.invalid} email${preview.invalid > 1 ? "s" : ""} invalide${preview.invalid > 1 ? "s" : ""}`
                  : ""}
                .
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-[#E05252]" role="alert">
                {error}
              </p>
            ) : null}
            {result ? <p className="mt-3 text-sm text-[#10b981]">{result}</p> : null}
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={loading || !preview || preview.rows === 0}
              className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-bt-cyan font-semibold text-navy disabled:opacity-50"
            >
              {loading
                ? "Import…"
                : preview
                  ? `Importer ${preview.rows} contact${preview.rows > 1 ? "s" : ""}`
                  : "Importer"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
