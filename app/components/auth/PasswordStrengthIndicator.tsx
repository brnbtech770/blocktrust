"use client";

import { getPasswordStrength, passwordStrengthLabel, validatePassword } from "@/lib/password-policy";

type Props = {
  password: string;
  email?: string;
  showErrors?: boolean;
};

const strengthColors = {
  weak: "bg-[#E05252]",
  medium: "bg-[#f59e0b]",
  strong: "bg-[#10b981]",
} as const;

export default function PasswordStrengthIndicator({ password, email, showErrors = false }: Props) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const validation = validatePassword(password, email);
  const width = strength === "weak" ? "33%" : strength === "medium" ? "66%" : "100%";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${strengthColors[strength]}`}
            style={{ width }}
          />
        </div>
        <span
          className={`text-xs font-medium ${
            strength === "weak"
              ? "text-[#E05252]"
              : strength === "medium"
                ? "text-[#f59e0b]"
                : "text-emerald-400"
          }`}
        >
          {passwordStrengthLabel(strength)}
        </span>
      </div>
      {showErrors && validation.errors.length > 0 ? (
        <ul className="space-y-1 text-xs text-[#E05252]">
          {validation.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
