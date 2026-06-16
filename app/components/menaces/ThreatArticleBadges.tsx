"use client";

import TechTermTooltip from "@/app/components/ui/TechTermTooltip";

type Props = {
  relevanceScore?: number;
};

export function ThreatSourceBadge({ source }: { source: string }) {
  const label =
    source === "CERT_FR"
      ? "CERT-FR"
      : source === "CYBERMALVEILLANCE"
        ? "Cybermalveillance.gouv"
        : source === "ZATAZ"
          ? "ZATAZ"
          : source;

  if (source === "ZATAZ") {
    return (
      <span className="rounded-md border border-[#BDA76B]/35 bg-[#BDA76B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#BDA76B]">
        <TechTermTooltip term="zataz">{label}</TechTermTooltip>
      </span>
    );
  }

  if (source === "CERT_FR") {
    return (
      <span className="rounded-md border border-[#BDA76B]/35 bg-[#BDA76B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#BDA76B]">
        <TechTermTooltip term="cert-fr">{label}</TechTermTooltip>
      </span>
    );
  }

  return (
    <span className="rounded-md border border-[#BDA76B]/35 bg-[#BDA76B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#BDA76B]">
      {label}
    </span>
  );
}

export function ThreatRelevanceBadge({ relevanceScore }: Props) {
  if (!relevanceScore || relevanceScore <= 0) return null;
  return (
    <span className="rounded-md border border-[#00d4ff]/35 bg-[#00d4ff]/10 px-2 py-0.5 font-mono text-[10px] text-[#00d4ff]">
      <TechTermTooltip term="pertinence">Pertinence {relevanceScore}/100</TechTermTooltip>
    </span>
  );
}
