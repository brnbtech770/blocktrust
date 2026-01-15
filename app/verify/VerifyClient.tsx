"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Verdict =
  | "VALID"
  | "VALID_WITH_WARNING"
  | "TAMPERED"
  | "REVOKED"
  | "EXPIRED"
  | "INVALID"
  | "ERROR";

export default function VerifyClient() {
  const sp = useSearchParams();
  const [token, setToken] = useState("");
  const [tokenFixApplied, setTokenFixApplied] = useState(false);
  const [context, setContext] = useState<{
    from: string;
    to: string;
    subject: string;
    date: string;
    body?: string;
  } | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const decodeContext = (value: string) => {
    try {
      const raw = decodeURIComponent(value);
      if (raw.trim().startsWith("{")) {
        return JSON.parse(raw);
      }
      const padded = raw
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(raw.length + (4 - (raw.length % 4 || 4)), "=");
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const direct = sp.get("token");
    if (direct) {
      setToken(direct);
    }

    const ctxParam = sp.get("ctx");
    if (ctxParam) {
      const decoded = decodeContext(ctxParam);
      if (decoded) setContext(decoded);
    }

    const search = window.location.search;
    if (search.includes("token%3D")) {
      const decodedQuery = decodeURIComponent(search.startsWith("?") ? search.slice(1) : search);
      const params = new URLSearchParams(decodedQuery);
      const fixedToken = params.get("token");
      if (fixedToken) {
        setToken(fixedToken);
        setTokenFixApplied(true);
      }
      const fixedCtx = params.get("ctx");
      if (fixedCtx && !context) {
        const decoded = decodeContext(fixedCtx);
        if (decoded) setContext(decoded);
      }
    }
  }, [sp]);

  useEffect(() => {
    if (!token || !context) return;

    (async () => {
      const res = await fetch("/api/v2/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, context }),
      });
      const data = await res.json();
      setVerdict(data.verdict);
      setReason(data.reason || null);
    })();
  }, [token, context]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>BlockTrust Verification</h1>
      {!token && <p>Missing token.</p>}
      {tokenFixApplied && (
        <p style={{ color: "#888", marginTop: 8 }}>
          Lien corrigé automatiquement (token encodé).
        </p>
      )}
      {token && !context && <p>Missing context.</p>}
      {token && context && !verdict && <p>Verifying...</p>}
      {verdict && (
        <div style={{ marginTop: 16, padding: 16, border: "1px solid #ccc", borderRadius: 12 }}>
          <div>
            <b>Verdict:</b> {verdict}
          </div>
          {reason && (
            <div>
              <b>Reason:</b> {reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
