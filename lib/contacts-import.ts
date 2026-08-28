// lib/contacts-import.ts
// Parse CSV contacts (email, prénom, nom, entreprise, téléphone, type)
// ============================================================

import { z } from "zod";

export const CONTACTS_IMPORT_MAX_ROWS = 500;

const emailSchema = z.string().email().max(254);

export type ParsedContactRow = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
};

export type ContactsCsvParseResult = {
  rows: ParsedContactRow[];
  invalid: number;
  duplicates: number;
};

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseContactsCsv(raw: string): ContactsCsvParseResult {
  const text = stripBom(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return { rows: [], invalid: 0, duplicates: 0 };

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], invalid: 0, duplicates: 0 };

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = splitCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
  const hasHeader = headerCells.some((h) => h.includes("email") || h.includes("prenom"));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const idx = (names: string[]) => {
    if (!hasHeader) return -1;
    for (const n of names) {
      const exact = headerCells.findIndex((h) => h === n);
      if (exact >= 0) return exact;
    }
    for (const n of names) {
      if (n.length <= 3) continue;
      const partial = headerCells.findIndex(
        (h) => h.includes(n) && !names.some((other) => other !== n && h === other),
      );
      if (partial >= 0) return partial;
    }
    return -1;
  };

  const emailIdx = hasHeader ? idx(["email"]) : 0;
  const firstIdx = hasHeader ? idx(["prenom", "firstname", "first"]) : 1;
  const lastIdx = hasHeader ? idx(["nom", "lastname", "last"]) : 2;
  const companyIdx = hasHeader ? idx(["entreprise", "company", "societe"]) : 3;
  const phoneIdx = hasHeader ? idx(["telephone", "phone", "tel"]) : 4;

  const rows: ParsedContactRow[] = [];
  let invalid = 0;
  let duplicates = 0;
  const seen = new Set<string>();

  for (const line of dataLines.slice(0, CONTACTS_IMPORT_MAX_ROWS + 50)) {
    const cells = splitCsvLine(line, delimiter);
    const emailRaw = (cells[emailIdx] ?? "").trim().toLowerCase();
    const parsedEmail = emailSchema.safeParse(emailRaw);
    if (!parsedEmail.success) {
      invalid += 1;
      continue;
    }
    if (seen.has(parsedEmail.data)) {
      duplicates += 1;
      continue;
    }
    seen.add(parsedEmail.data);

    const firstName = (cells[firstIdx] ?? "").trim() || "Contact";
    const lastName = (cells[lastIdx] ?? "").trim() || "-";
    const company = (cells[companyIdx] ?? "").trim() || null;
    const phone = (cells[phoneIdx] ?? "").trim() || null;

    rows.push({
      email: parsedEmail.data,
      firstName: firstName.slice(0, 100),
      lastName: lastName.slice(0, 100),
      phone,
      company,
    });
  }

  return { rows: rows.slice(0, CONTACTS_IMPORT_MAX_ROWS), invalid, duplicates };
}

export function contactsCsvTemplate(): string {
  return [
    "email,prénom,nom,entreprise,téléphone,type",
    "jean.dupont@example.com,Jean,Dupont,Acme SA,0612345678,Particulier",
  ].join("\n");
}
