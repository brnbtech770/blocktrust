"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

type Props = {
  /** Si true, le bouton retour mène à / au lieu de router.back() */
  backHref?: string;
};

export default function AuthMinimalHeader({ backHref }: Props) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Retour à la page précédente"
        className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-white/15 text-white/75 transition-colors hover:border-bt-cyan/50 hover:text-bt-cyan"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>

      <Link
        href="/"
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5"
        style={{ textDecoration: "none" }}
        aria-label="Accueil BLOCKTRUST™"
      >
        <BlockTrustBadge size={36} instanceId="auth-header" showWatermark={false} className="shrink-0" />
        <span className="font-syne text-sm font-bold leading-none tracking-wider text-bt-cyan sm:text-base">
          BLOCKTRUST<span className="text-[10px] align-super">™</span>
        </span>
      </Link>

      <span className="min-w-[44px]" aria-hidden />
    </header>
  );
}
