// lib/mcp/helpers/typosquatting.ts
// Détection typosquatting — Levenshtein ≤ 2 + homoglyphes visuels (o/0, l/1, rn/m, .com/.co).
// ============================================================

const VISUAL_SUBSTITUTIONS: Array<[string, string]> = [
  ["o", "0"],
  ["l", "1"],
  ["l", "i"],
  ["1", "i"],
  ["rn", "m"],
  ["vv", "w"],
  [".com", ".co"],
];

export type TyposquattingResult = {
  detected: boolean;
  similarTo?: string;
  technique?: string;
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function applyVisualVariants(domain: string): string[] {
  const variants = new Set<string>([domain]);
  for (const [from, to] of VISUAL_SUBSTITUTIONS) {
    for (const v of [...variants]) {
      if (v.includes(from)) {
        variants.add(v.replace(from, to));
        variants.add(v.replace(to, from));
      }
    }
  }
  return [...variants];
}

function detectTechnique(candidate: string, certified: string): string | undefined {
  for (const [from, to] of VISUAL_SUBSTITUTIONS) {
    if (candidate.includes(to) && certified.includes(from)) {
      return `Substitution (${from}→${to})`;
    }
    if (candidate.includes(from) && certified.includes(to)) {
      return `Substitution (${from}→${to})`;
    }
  }
  if (levenshtein(candidate, certified) === 1) return "Substitution d'un caractère";
  if (levenshtein(candidate, certified) === 2) return "Distance Levenshtein ≤ 2";
  return undefined;
}

export function detectTyposquatting(
  domain: string,
  certifiedDomains: string[],
): TyposquattingResult {
  const candidate = normalizeDomain(domain);
  if (!candidate || certifiedDomains.length === 0) {
    return { detected: false };
  }

  const certifiedNorm = [
    ...new Set(
      certifiedDomains
        .map((d) => normalizeDomain(d))
        .filter((d) => d.length > 0 && d !== candidate),
    ),
  ];

  for (const certified of certifiedNorm) {
    if (candidate === certified) continue;

    const distance = levenshtein(candidate, certified);
    if (distance > 0 && distance <= 2) {
      return {
        detected: true,
        similarTo: certified,
        technique: detectTechnique(candidate, certified),
      };
    }

    const candidateVariants = applyVisualVariants(candidate);
    for (const variant of candidateVariants) {
      if (variant === certified || levenshtein(variant, certified) <= 1) {
        return {
          detected: true,
          similarTo: certified,
          technique: detectTechnique(candidate, certified) ?? "Homoglyphe visuel",
        };
      }
    }
  }

  return { detected: false };
}

export function findSimilarCertifiedDomains(
  domain: string,
  certifiedDomains: string[],
): string[] {
  const result = detectTyposquatting(domain, certifiedDomains);
  if (!result.detected || !result.similarTo) return [];
  return [result.similarTo];
}
