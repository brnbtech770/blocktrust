"use client";

import { WifiOff } from "lucide-react";

type ServiceUnavailableScreenProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function ServiceUnavailableScreen({
  title,
  message,
  onRetry,
}: ServiceUnavailableScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#f59e0b]/65 bg-[#f59e0b]/10">
        <WifiOff className="h-8 w-8 text-[#f59e0b]" strokeWidth={2} aria-hidden />
      </div>
      <p className="mt-6 font-syne text-xs font-semibold uppercase tracking-widest text-[#00d4ff]">
        BLOCKTRUST™
      </p>
      <h1 className="mt-3 max-w-md font-syne text-2xl font-bold text-white">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{message}</p>
      <button
        type="button"
        onClick={() => {
          if (onRetry) {
            onRetry();
            return;
          }
          window.location.reload();
        }}
        className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#00d4ff] px-6 py-3 text-sm font-semibold text-[#0a1628] transition hover:bg-[#00d4ff]/90"
      >
        Réessayer
      </button>
    </div>
  );
}
