"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Verdict = "VALID" | "VALID_WITH_WARNING" | "TAMPERED" | "REVOKED" | "EXPIRED" | "INVALID" | "ERROR";

function VerifyContent() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-blue-900/30 backdrop-blur-lg p-8 rounded-3xl border border-blue-800/50 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <span className="text-5xl block">🛡️</span>
            <div className="absolute inset-0 text-5xl blur-sm opacity-50">🛡️</div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent mb-2 relative">
            BlockTrust Verification
            <span className="absolute inset-0 text-4xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent blur-[2px] opacity-30">
              BlockTrust Verification
            </span>
          </h1>
        </div>
        
        {!token && (
          <div className="text-center">
            <p className="text-gray-300 text-lg">Token manquant.</p>
          </div>
        )}
        
        {tokenFixApplied && (
          <div className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 px-4 py-3 rounded-lg mb-4 text-center">
            <p>Lien corrigé automatiquement (token encodé).</p>
          </div>
        )}
        
        {token && !verdict && (
          <div className="text-center">
            <p className="text-gray-300 text-lg">Vérification en cours...</p>
          </div>
        )}
        
        {verdict && (
          <div className="bg-blue-800/50 border border-blue-700/50 rounded-xl p-6 mt-6">
            <div className="mb-4">
              <span className="text-gray-300 font-medium">Verdict:</span>
              <span className={`ml-2 font-bold ${
                verdict === 'VALID' ? 'text-green-400' :
                verdict === 'VALID_WITH_WARNING' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {verdict}
              </span>
            </div>
            {reason && (
              <div>
                <span className="text-gray-300 font-medium">Raison:</span>
                <p className="text-gray-300 mt-2">{reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-300 text-center">Chargement...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
