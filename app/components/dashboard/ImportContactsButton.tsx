"use client";

import { Suspense } from "react";
import { Upload } from "lucide-react";
import ImportContactsModal from "@/app/dashboard/contacts/ImportContactsModal";

function ImportButtonFallback() {
  return (
    <button
      type="button"
      disabled
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white/60"
    >
      <Upload className="h-4 w-4 shrink-0" aria-hidden />
      Importer mes contacts
    </button>
  );
}

export default function ImportContactsButton() {
  return (
    <Suspense fallback={<ImportButtonFallback />}>
      <ImportContactsModal />
    </Suspense>
  );
}
