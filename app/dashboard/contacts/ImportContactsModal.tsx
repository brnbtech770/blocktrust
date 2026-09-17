"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, FileSpreadsheet, Mail, Upload, X } from "lucide-react";
import { CONTACTS_IMPORT_MAX_ROWS, contactsCsvTemplate, parseContactsCsv } from "@/lib/contacts-import";

type Source = "chooser" | "google" | "csv";

type GooglePreviewContact = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
  certified?: boolean;
};

const PAGE_SIZE = 20;

const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  denied: "Autorisation Google refusée.",
  oauth: "Connexion Google interrompue.",
  state: "Session d'import expirée. Relancez l'autorisation.",
  token: "Impossible d'obtenir l'accès Google Contacts.",
  people: "Impossible de lire vos contacts Google.",
  config: "Import Google temporairement indisponible.",
  rate: "Trop de tentatives. Réessayez dans une heure.",
  email_not_verified: "Confirmez votre adresse email pour importer des contacts.",
  account_suspended: "Compte suspendu.",
  discovery_expired: "Votre période Découverte est expirée.",
};

function downloadTemplate() {
  const blob = new Blob([contactsCsvTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-contacts-blocktrust.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportContactsModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>("chooser");
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
  const [googleContacts, setGoogleContacts] = useState<GooglePreviewContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);

  const clearImportQuery = useCallback(() => {
    if (!searchParams.get("import") && !searchParams.get("importError")) return;
    router.replace("/dashboard/entities");
  }, [router, searchParams]);

  const loadGooglePreview = useCallback(async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/google/preview", { credentials: "include" });
      const data = (await res.json()) as {
        contacts?: GooglePreviewContact[];
        expired?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Impossible de charger les contacts Google.");
        return;
      }
      if (data.expired) {
        setError("Session d'import Google expirée. Relancez l'autorisation.");
        setGoogleContacts([]);
        return;
      }
      setGoogleContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setSelectedIds(new Set());
      setPage(0);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    const importError = searchParams.get("importError");
    const importSource = searchParams.get("import");
    if (!importError && importSource !== "google") return;

    setOpen(true);
    if (importError) {
      setSource("chooser");
      setError(IMPORT_ERROR_MESSAGES[importError] ?? "Import Google impossible.");
      clearImportQuery();
      return;
    }

    setSource("google");
    void loadGooglePreview();
    clearImportQuery();
  }, [searchParams, loadGooglePreview, clearImportQuery]);

  const pageCount = Math.max(1, Math.ceil(googleContacts.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return googleContacts.slice(start, start + PAGE_SIZE);
  }, [googleContacts, page]);

  const selectedCount = selectedIds.size;
  const allSelected =
    googleContacts.length > 0 && selectedIds.size === googleContacts.length;

  function resetModal() {
    setSource("chooser");
    setFileName(null);
    setPreview(null);
    setCsvData("");
    setLoading(false);
    setResult(null);
    setError(null);
    setGoogleContacts([]);
    setSelectedIds(new Set());
    setPage(0);
  }

  function close() {
    setOpen(false);
    resetModal();
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

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < CONTACTS_IMPORT_MAX_ROWS) next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(googleContacts.map((row) => row.id).slice(0, CONTACTS_IMPORT_MAX_ROWS)));
  }

  async function handleCsvImport() {
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
        quotaSkipped?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message || data.error || "Import impossible.");
        return;
      }
      setResult(formatImportResult(data));
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleImport() {
    if (selectedCount === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/import-google", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactIds: [...selectedIds] }),
      });
      const data = (await res.json()) as {
        imported?: number;
        duplicates?: number;
        invalid?: number;
        quotaSkipped?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message || data.error || "Import impossible.");
        return;
      }
      setResult(formatImportResult(data));
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
        onClick={() => {
          resetModal();
          setOpen(true);
        }}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
      >
        <Upload className="h-4 w-4 shrink-0" aria-hidden />
        Importer mes contacts
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fermer"
            onClick={close}
          />
          <div
            role="dialog"
            aria-labelledby="import-contacts-title"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1f3c] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="import-contacts-title" className="font-syne text-lg font-bold text-white">
                Importer mes contacts
              </h2>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <p className="mb-4 text-sm text-white/55">
              Aucune invitation Trust Circle n&apos;est envoyée. Maximum {CONTACTS_IMPORT_MAX_ROWS}{" "}
              contacts par import.
            </p>

            {source === "chooser" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/api/contacts/google/start";
                  }}
                  className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-4 text-sm font-semibold text-white transition hover:border-bt-cyan/50 hover:bg-white/5"
                >
                  <Mail className="h-5 w-5 text-bt-cyan" aria-hidden />
                  Google Contacts
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-4 text-sm font-semibold text-white/35"
                >
                  <Calendar className="h-5 w-5" aria-hidden />
                  Outlook
                  <span className="text-xs font-medium">Bientôt disponible</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSource("csv");
                    setError(null);
                    setResult(null);
                  }}
                  className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-4 text-sm font-semibold text-white transition hover:border-bt-cyan/50 hover:bg-white/5"
                >
                  <FileSpreadsheet className="h-5 w-5 text-bt-cyan" aria-hidden />
                  Fichier CSV
                </button>
              </div>
            ) : null}

            {source === "csv" ? (
              <div className="min-h-0 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSource("chooser");
                    setError(null);
                    setResult(null);
                  }}
                  className="mb-3 text-sm font-semibold text-bt-cyan hover:underline"
                >
                  Retour aux sources
                </button>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="mb-4 block text-sm font-semibold text-bt-cyan hover:underline"
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
              </div>
            ) : null}

            {source === "google" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                {googleLoading ? (
                  <p className="text-sm text-white/60">Chargement de vos contacts Google…</p>
                ) : googleContacts.length === 0 ? (
                  <p className="text-sm text-white/60">
                    Aucun contact Google avec email utilisable.
                  </p>
                ) : (
                  <>
                    <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-bt-cyan"
                      />
                      Sélectionner tout (max {CONTACTS_IMPORT_MAX_ROWS})
                    </label>
                    <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
                      {pageItems.map((row) => {
                        const name = `${row.firstName} ${row.lastName}`.replace(/ -$/, "").trim();
                        return (
                          <li key={row.id}>
                            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-white/5">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.id)}
                                onChange={() => toggleId(row.id)}
                                className="mt-1 h-4 w-4 shrink-0 accent-bt-cyan"
                              />
                              <span className="min-w-0 text-sm text-white/85">
                                <span className="font-medium text-white">{name}</span>
                                <span className="text-white/45"> — {row.email}</span>
                                {row.company ? (
                                  <span className="text-white/45"> — {row.company}</span>
                                ) : null}
                                {row.certified ? (
                                  <span className="ml-2 text-xs font-bold text-[#10b981]">
                                    Certifié ✓
                                  </span>
                                ) : (
                                  <span className="ml-2 text-xs text-white/40">Non certifié</span>
                                )}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    {pageCount > 1 ? (
                      <div className="mt-3 flex items-center justify-between text-sm text-white/60">
                        <button
                          type="button"
                          disabled={page === 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          className="rounded-md px-3 py-2 hover:bg-white/5 disabled:opacity-40"
                        >
                          Précédent
                        </button>
                        <span>
                          Page {page + 1} / {pageCount}
                        </span>
                        <button
                          type="button"
                          disabled={page >= pageCount - 1}
                          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                          className="rounded-md px-3 py-2 hover:bg-white/5 disabled:opacity-40"
                        >
                          Suivant
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-[#E05252]" role="alert">
                {error}
              </p>
            ) : null}
            {result ? <p className="mt-3 text-sm text-[#10b981]">{result}</p> : null}

            {source === "csv" ? (
              <button
                type="button"
                onClick={() => void handleCsvImport()}
                disabled={loading || !preview || preview.rows === 0}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-bt-cyan font-semibold text-navy disabled:opacity-50"
              >
                {loading
                  ? "Import…"
                  : preview
                    ? `Importer ${preview.rows} contact${preview.rows > 1 ? "s" : ""}`
                    : "Importer"}
              </button>
            ) : null}

            {source === "google" && !result ? (
              <button
                type="button"
                onClick={() => void handleGoogleImport()}
                disabled={loading || selectedCount === 0}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-bt-cyan font-semibold text-navy disabled:opacity-50"
              >
                {loading
                  ? "Import…"
                  : `Importer ${selectedCount} contact${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatImportResult(data: {
  imported?: number;
  duplicates?: number;
  quotaSkipped?: number;
}): string {
  const imported = data.imported ?? 0;
  const duplicates = data.duplicates ?? 0;
  const quota = data.quotaSkipped ?? 0;
  let text = `${imported} contact${imported > 1 ? "s" : ""} importé${imported > 1 ? "s" : ""}, ${duplicates} doublon${duplicates > 1 ? "s" : ""} ignoré${duplicates > 1 ? "s" : ""}`;
  if (quota > 0) {
    text += `, ${quota} au-delà du quota`;
  }
  return text;
}
