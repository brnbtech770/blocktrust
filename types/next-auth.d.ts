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
      kycStatus?: string;
      accountType?: string;
      cookieConsent?: boolean;
    };
  }
  interface User {
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
    kycStatus?: string;
    accountType?: string;
    cookieConsent?: boolean;
  }
}
