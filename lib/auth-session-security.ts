/**
 * Décision session JWT après lookup User — pur, sans Prisma.
 * Neon injoignable : fail-open (ne pas invalider, ne pas renvoyer vers /auth/signin).
 */

export type SessionSecurityRow = {
  sessionVersion: number;
  email: string | null;
  accountStatus: string;
};

export type SessionSecurityDecision = {
  invalid: boolean;
  adoptSessionVersion?: number;
};

export function evaluateSessionSecurity(args: {
  dbUnreachable: boolean;
  row: SessionSecurityRow | null;
  tokenSessionVersion: number | undefined;
}): SessionSecurityDecision {
  if (args.dbUnreachable) {
    return { invalid: false };
  }
  if (!args.row || args.row.email?.startsWith("deleted_")) {
    return { invalid: true };
  }
  if (args.row.accountStatus === "SUSPENDED") {
    return { invalid: true };
  }
  if (
    typeof args.tokenSessionVersion === "number" &&
    args.row.sessionVersion > args.tokenSessionVersion
  ) {
    return { invalid: true };
  }
  if (typeof args.tokenSessionVersion !== "number") {
    return { invalid: false, adoptSessionVersion: args.row.sessionVersion };
  }
  return { invalid: false };
}
