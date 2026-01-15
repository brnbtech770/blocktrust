"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Verdict = "VALID" | "VALID_WITH_WARNING" | "TAMPERED" | "REVOKED" | "EXPIRED" | "INVALID" | "ERROR";

export default function VerifyPage() {
  const sp = useSearchParams();
  const [token, setToken] = useState("");
  const [tokenFixApplied, setTokenFixApplied] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  // Temporary demo context (replace later by plugin/email parser)
  const context = useMemo(
    () => ({
      from: "contact@brnb.fr",
      to: "test@client.com",
      subject: "Test BlockTrust V2",
      date: new Date().toISOString(),
      body: "Hello",
    }),
    []
  );

  useEffect(() => {
    const direct = sp.get("token");
    if (direct) {
      setToken(direct);
      return;
    }

    const search = window.location.search;
    if (search.includes("token%3D")) {
      const fixedSearch = search.replace("token%3D", "token=");
      const params = new URLSearchParams(fixedSearch);
      const fixedToken = params.get("token");
      if (fixedToken) {
        setToken(fixedToken);
        setTokenFixApplied(true);
      }
    }
  }, [sp]);

  useEffect(() => {
    if (!token) return;

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
      {token && !verdict && <p>Verifying...</p>}
      {verdict && (
        <div style={{ marginTop: 16, padding: 16, border: "1px solid #ccc", borderRadius: 12 }}>
          <div><b>Verdict:</b> {verdict}</div>
          {reason && <div><b>Reason:</b> {reason}</div>}
        </div>
      )}
    </div>
  );
}
