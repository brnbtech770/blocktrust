"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type UnavailableReason = "script_error" | "render_error";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onUnavailable?: (reason: UnavailableReason) => void;
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
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  onUnavailable,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const unavailableRef = useRef(onUnavailable);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    unavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    if (!siteKey.trim()) {
      console.error("[turnstile] Turnstile site key missing");
      unavailableRef.current?.("render_error");
      return;
    }

    if (!ready || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => onToken(token),
        "expired-callback": () => {
          onExpire?.();
          if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        },
        "error-callback": () => {
          console.error("[turnstile] Turnstile widget error callback");
          unavailableRef.current?.("render_error");
        },
      });
    } catch (err) {
      console.error("[turnstile] Turnstile render failed", err);
      unavailableRef.current?.("render_error");
    }
  }, [ready, siteKey, onToken, onExpire]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => {
          console.error("[turnstile] Turnstile script blocked");
          unavailableRef.current?.("script_error");
        }}
      />
      <div ref={containerRef} className="min-h-[65px]" aria-label="Vérification de sécurité" />
    </>
  );
}
