"use client";

import Link from "next/link";
import { Bot, BookOpen, Copy, Check, KeyRound } from "lucide-react";
import { useState } from "react";

const MCP_SSE_URL = "https://blocktrust.tech/mcp/sse";

export default function ExtensionMcpPanel() {
  const [copied, setCopied] = useState<"url" | null>(null);

  async function copy(text: string, key: "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-bt-gold/30 bg-[#0d1f3c]/80 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bt-cyan/15 text-bt-cyan">
          <Bot className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-syne text-lg font-semibold text-white [text-wrap:balance]">
            Assistants IA (MCP)
          </h2>
          <p className="mt-1 text-sm text-white/70 [text-wrap:balance]">
            Connectez votre assistant IA à BLOCKTRUST pour vérifier des identités, gérer vos
            contacts et détecter la fraude — directement depuis Claude, GPT ou tout agent MCP.
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="font-medium text-white/60">URL serveur MCP</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-md bg-[#060d1a] px-2 py-1 font-mono text-xs text-bt-cyan">
              {MCP_SSE_URL}
            </code>
            <button
              type="button"
              onClick={() => copy(MCP_SSE_URL, "url")}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-white/10 px-2.5 text-xs text-white/80 hover:bg-white/5"
            >
              {copied === "url" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              Copier
            </button>
          </dd>
        </div>
        <div className="flex items-start gap-2 text-white/75">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-bt-gold" aria-hidden />
          <p className="[text-wrap:balance]">
            Utilisez votre <strong className="font-medium text-white">clé API</strong> (la même
            que pour les extensions Chrome et Outlook) dans l&apos;en-tête{" "}
            <code className="font-mono text-xs text-bt-cyan">Authorization: Bearer bt_ext_…</code>
          </p>
        </div>
      </dl>

      <p className="mt-4 text-xs text-white/50">
        Compatible avec Claude Desktop, Cursor, GPT (connecteurs MCP) et tout client supportant le
        transport SSE MCP.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/mcp"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/10 px-4 py-2 text-sm font-semibold text-bt-cyan transition hover:bg-bt-cyan/20"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Documentation
        </Link>
      </div>
    </section>
  );
}
