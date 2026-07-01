"use client";

import { Search } from "lucide-react";
import type { RefObject } from "react";

type VerifyFormProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  manualIdInput: string;
  onManualIdInputChange: (value: string) => void;
  onSubmit: () => void;
  hidden?: boolean;
};

export default function VerifyForm({
  inputRef,
  manualIdInput,
  onManualIdInputChange,
  onSubmit,
  hidden,
}: VerifyFormProps) {
  if (hidden) return null;

  return (
    <div className="w-full shrink-0">
      <p className="mb-3 text-center text-xs text-white/45">Vérifier un badge</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="URL ou ID du badge…"
          aria-label="URL ou identifiant du badge à vérifier"
          className="min-h-[48px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00d4ff]/50 focus:ring-2 focus:ring-[#00d4ff]/15"
          value={manualIdInput}
          onChange={(e) => onManualIdInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!manualIdInput.trim()}
          className="flex min-h-[48px] w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-5 py-3 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30 disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:px-4"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          Vérifier
        </button>
      </div>
    </div>
  );
}
