import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan: string;
      planType?: string;
      kycStatus?: string;
      accountType?: string;
      cookieConsent?: boolean;
    };
  }
  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    plan?: string;
    kycStatus?: string;
    accountType?: string;
    cookieConsent?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    /** Plan métier normalisé (ex. B2B_ENTERPRISE pour admins) */
    planType?: string;
    /** Bootstrap admin déjà lancé pour cette session JWT */
    adminBootstrapped?: boolean;
    /** Timestamp du dernier fetch plan depuis la DB */
    planFetchedAt?: number;
    kycStatus?: string;
    accountType?: string;
    cookieConsent?: boolean;
    /** Version sessions — invalidation après changement MDP */
    sessionVersion?: number;
    sessionInvalid?: boolean;
  }
}
