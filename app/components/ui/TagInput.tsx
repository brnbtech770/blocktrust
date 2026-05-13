"use client";

import { Globe, Mail, Phone, Plus, X, type LucideIcon } from "lucide-react";
import type { JSX } from "react";
import { useCallback, useState } from "react";

import {
  CERTIFIED_CONTACT_MAX_ITEMS,
  normalizeCertifiedDomainInput,
  normalizeCertifiedEmailInput,
  normalizeCertifiedPhoneInput,
  isValidCertifiedDomain,
  isValidCertifiedEmail,
  isValidCertifiedPhone,
} from "@/lib/certified-contact";

interface TagInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  /** Return true when the normalized input may be stored */
  validate: (normalized: string) => boolean;
  Icon?: LucideIcon;
  /** Applied to trimmed draft before validate + store */
  normalizeForChip?: (trimmedRaw: string) => string;
  /** Plafond jetons (défaut : constante globale certifiée) */
  maxItems?: number;
}

export function TagInput({
  values,
  onChange,
  placeholder,
  validate,
  Icon,
  normalizeForChip,
  maxItems: maxItemsProp,
}: TagInputProps): JSX.Element {
  const maxItems = maxItemsProp ?? CERTIFIED_CONTACT_MAX_ITEMS;
  const [draft, setDraft] = useState("");

  const add = useCallback(() => {
    let t = draft.trim();
    if (!t) return;
    if (normalizeForChip) t = normalizeForChip(t);
    if (!t || values.length >= maxItems) return;
    if (!validate(t)) return;
    if (!values.includes(t)) onChange([...values, t]);
    setDraft("");
  }, [draft, normalizeForChip, validate, values, onChange, maxItems]);

  function remove(at: number): void {
    onChange(values.filter((_, i) => i !== at));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  const atCap = values.length >= maxItems;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 font-mono text-xs text-white/90"
          >
            {Icon ? (
              <Icon className="size-3 shrink-0 text-cyan-400" aria-hidden />
            ) : null}
            {v}
            <button
              type="button"
              aria-label={`Retirer ${v}`}
              className="-mr-0.5 rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => remove(i)}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      {!atCap ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00d4ff]/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={add}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-3 py-2 text-xs font-medium uppercase tracking-wide text-[#00d4ff] hover:bg-[#00d4ff]/25"
          >
            <Plus className="size-4" aria-hidden /> Ajouter
          </button>
        </div>
      ) : null}
      <p className="text-[10px] uppercase tracking-wider text-white/25">
        Maximum {maxItems} entrée{maxItems > 1 ? "s" : ""} pour ce champ.
      </p>
    </div>
  );
}

interface DomainTagInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function DomainTagInput({
  values,
  onChange,
  placeholder = "mondomaine.fr",
  maxItems,
}: DomainTagInputProps): JSX.Element {
  return (
    <TagInput
      values={values}
      onChange={onChange}
      placeholder={placeholder}
      Icon={Globe}
      normalizeForChip={normalizeCertifiedDomainInput}
      validate={(n) => n.length > 0 && isValidCertifiedDomain(n)}
      maxItems={maxItems}
    />
  );
}

interface CertifiedEmailsTagInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function CertifiedEmailsTagInput({
  values,
  onChange,
  placeholder = "contact@mondomaine.fr",
  maxItems,
}: CertifiedEmailsTagInputProps): JSX.Element {
  return (
    <TagInput
      values={values}
      onChange={onChange}
      placeholder={placeholder}
      Icon={Mail}
      normalizeForChip={normalizeCertifiedEmailInput}
      validate={(n) => n.length > 0 && isValidCertifiedEmail(n)}
      maxItems={maxItems}
    />
  );
}

interface CertifiedPhonesTagInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function CertifiedPhonesTagInput({
  values,
  onChange,
  placeholder = "+33612345678",
  maxItems,
}: CertifiedPhonesTagInputProps): JSX.Element {
  return (
    <TagInput
      values={values}
      onChange={onChange}
      placeholder={placeholder}
      Icon={Phone}
      normalizeForChip={normalizeCertifiedPhoneInput}
      validate={(n) => n.length > 0 && isValidCertifiedPhone(n)}
      maxItems={maxItems}
    />
  );
}
