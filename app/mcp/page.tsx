// app/mcp/page.tsx
// Documentation publique serveur MCP BlockTrust.
// ============================================================

import Link from "next/link";
import { Bot, Shield, Users, Vault, ArrowRight } from "lucide-react";
import { MCP_TOOL_DEFINITIONS } from "@/lib/mcp/tool-definitions";

export const metadata = {
  title: "BLOCKTRUST MCP — Connectez votre assistant IA",
  description:
    "Serveur MCP BlockTrust : vérification d'identité, Trust Circle, Vault et détection anti-fraude pour agents IA.",
};

const BLOCKS = [
  {
    id: "A",
    title: "Vérification",
    icon: Shield,
    tools: MCP_TOOL_DEFINITIONS.slice(0, 8),
  },
  {
    id: "B",
    title: "Contacts",
    icon: Users,
    tools: MCP_TOOL_DEFINITIONS.slice(8, 11),
  },
  {
    id: "C",
    title: "Trust Circle",
    icon: Users,
    tools: MCP_TOOL_DEFINITIONS.slice(11, 13),
  },
  {
    id: "D",
    title: "Vault",
    icon: Vault,
    tools: MCP_TOOL_DEFINITIONS.slice(13, 15),
  },
] as const;

export default function McpDocumentationPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white/85">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bt-cyan/15 text-bt-cyan">
            <Bot className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="font-syne text-3xl font-bold tracking-tight text-white sm:text-4xl [text-wrap:balance]">
            BLOCKTRUST MCP — Connectez votre assistant IA
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70 [text-wrap:balance]">
            15 outils pour vérifier des identités, protéger vos échanges et détecter la fraude —
            directement depuis Claude, GPT ou tout agent compatible MCP.
          </p>
        </header>

        <section className="mt-12 rounded-xl border border-white/10 bg-[#0d1f3c] p-6 sm:p-8">
          <h2 className="font-syne text-xl font-semibold text-white">Connexion</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-white/50">URL SSE</dt>
              <dd className="mt-1 font-mono text-bt-cyan break-all">https://blocktrust.tech/mcp/sse</dd>
            </div>
            <div>
              <dt className="text-white/50">Authentification</dt>
              <dd className="mt-1 font-mono text-sm">
                Authorization: Bearer bt_ext_…
              </dd>
            </div>
            <div>
              <dt className="text-white/50">Clé API</dt>
              <dd className="mt-1">
                <Link href="/dashboard/extension" className="text-bt-cyan hover:underline">
                  Générer votre clé → Dashboard Extension
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-white/50">Rate limit</dt>
              <dd className="mt-1">60 requêtes / minute par clé API</dd>
            </div>
          </dl>
        </section>

        {BLOCKS.map((block) => (
          <section key={block.id} className="mt-10">
            <h2 className="flex items-center gap-2 font-syne text-lg font-semibold text-white">
              <block.icon className="h-5 w-5 text-bt-cyan" aria-hidden />
              Bloc {block.id} — {block.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {block.tools.map((tool) => (
                <li
                  key={tool.name}
                  className="rounded-lg border border-white/10 bg-[#0d1f3c]/60 px-4 py-3"
                >
                  <code className="font-mono text-sm text-bt-cyan">{tool.name}</code>
                  <p className="mt-1 text-sm text-white/70 [text-wrap:balance]">{tool.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-12 rounded-xl border border-bt-gold/30 bg-[#060d1a] p-6 sm:p-8">
          <h2 className="font-syne text-xl font-semibold text-white">Exemples</h2>
          <div className="mt-4 space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-bt-cyan">Vérifier un email suspect</h3>
              <p className="mt-2 text-white/70 [text-wrap:balance]">
                « Est-ce que jean@cabinet-dupont.fr est certifié BLOCKTRUST ? » → l&apos;agent
                appelle <code className="font-mono text-xs">verify_identity</code> puis{" "}
                <code className="font-mono text-xs">get_trust_score</code>.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-bt-cyan">Anti-fraude RIB</h3>
              <p className="mt-2 text-white/70 [text-wrap:balance]">
                « Compare ce RIB reçu par email avec celui de mon notaire » → l&apos;agent appelle{" "}
                <code className="font-mono text-xs">search_vault</code> avec{" "}
                <code className="font-mono text-xs">compareValue</code>. Si la valeur ne
                correspond pas → alerte fraude critique.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-bt-cyan">Phishing / typosquatting</h3>
              <p className="mt-2 text-white/70 [text-wrap:balance]">
                « Ce lien cabinet-dup0nt.fr est-il sûr ? » →{" "}
                <code className="font-mono text-xs">verify_website</code> +{" "}
                <code className="font-mono text-xs">check_domain_reputation</code>.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/register"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-bt-cyan px-6 py-3 font-semibold text-[#0a1628] transition hover:bg-bt-cyan/90"
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/dashboard/extension"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/90 hover:bg-white/5"
          >
            Obtenir ma clé API
          </Link>
        </div>
      </div>
    </div>
  );
}
