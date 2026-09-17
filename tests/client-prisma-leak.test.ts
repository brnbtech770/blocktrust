import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "app");

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTsx(p, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

function isClientModule(src: string): boolean {
  const head = src.slice(0, 400);
  return head.includes('"use client"') || head.includes("'use client'");
}

describe("Prisma ne doit pas entrer dans un bundle client", () => {
  it("aucun fichier use client n’importe @/app/lib/db ni @/lib/email-utils", () => {
    const offenders: string[] = [];
    for (const file of walkTsx(ROOT)) {
      const src = readFileSync(file, "utf8");
      if (!isClientModule(src)) continue;
      if (src.includes("@/app/lib/db") || src.includes("@/lib/email-utils")) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("email-normalize.ts n’importe pas Prisma", () => {
    const src = readFileSync(join(process.cwd(), "lib/email-normalize.ts"), "utf8");
    expect(src).not.toMatch(/from ["']@\/app\/lib\/db["']/);
    expect(src).not.toMatch(/from ["']@prisma\/client["']/);
  });

  it("app/lib/db.ts est marqué server-only", () => {
    const src = readFileSync(join(process.cwd(), "app/lib/db.ts"), "utf8");
    expect(src).toMatch(/import ["']server-only["']/);
  });
});
