"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({ siteKey, onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (token) => onToken(token),
      "expired-callback": () => {
        onExpire?.();
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      },
    });
  }, [ready, siteKey, onToken, onExpire]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" aria-label="Vérification de sécurité" />
    </>
  );
}
