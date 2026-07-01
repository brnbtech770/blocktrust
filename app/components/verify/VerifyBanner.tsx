"use client";

import { Clock, ShieldAlert } from "lucide-react";

type VerifyBannerProps = {
  showIncompleteTokenError: boolean;
  activeVt: string;
  vtResolveStatus: "idle" | "loading" | "ok" | "error";
  vtResolveError: "expired" | "invalid" | null;
  vtWasUsed: boolean;
  showSuccess: boolean;
  hasVerdict: boolean;
  tokenFixApplied: boolean;
};

export default function VerifyBanner({
  showIncompleteTokenError,
  activeVt,
  vtResolveStatus,
  vtResolveError,
  vtWasUsed,
  showSuccess,
  hasVerdict,
  tokenFixApplied,
}: VerifyBannerProps) {
  return (
    <>
      {showIncompleteTokenError ? (
        <div className="mx-auto mt-10 max-w-md text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[#00d4ff]/50" aria-hidden />
          <p className="font-syne text-lg text-[#00d4ff]/90">INVALIDE — Lien incomplet</p>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            Le jeton de vérification dans l&apos;URL est invalide ou tronqué. Scannez le QR code
            officiel depuis un message certifié BLOCKTRUST™ ou saisissez l&apos;URL / l&apos;identifiant
            du badge ci-dessus.
          </p>
        </div>
      ) : null}

      {activeVt && vtResolveStatus === "error" ? (
        <div className="mx-auto mt-10 max-w-md text-center">
          <Clock className="mx-auto mb-4 h-10 w-10 text-[#f59e0b]/70" aria-hidden />
          <p className="font-syne text-lg text-[#f59e0b]">
            {vtResolveError === "expired" ? "Lien expiré" : "Lien invalide"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            {vtResolveError === "expired"
              ? "Ce lien de vérification a expiré. Demandez un nouveau lien."
              : "Ce lien de vérification est invalide. Vérifiez l'URL ou demandez un nouveau lien à l'émetteur du badge."}
          </p>
        </div>
      ) : null}

      {activeVt && vtWasUsed && vtResolveStatus === "ok" && hasVerdict && showSuccess ? (
        <div
          role="status"
          className="mx-auto mt-6 w-full max-w-md rounded-xl border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-4 py-3 text-center text-sm text-[#00d4ff]/90"
        >
          Ce lien a déjà été consulté — la vérification reste valide.
        </div>
      ) : null}

      {tokenFixApplied ? (
        <div
          role="status"
          className="mt-8 w-full max-w-sm rounded-xl border border-bt-cyan/35 bg-[#00d4ff]/10 px-4 py-3 text-center text-sm text-[#00d4ff]"
        >
          Lien corrigé automatiquement (jeton encodé).
        </div>
      ) : null}
    </>
  );
}
