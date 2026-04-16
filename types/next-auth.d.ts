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
    kycStatus?: string;
    accountType?: string;
    cookieConsent?: boolean;
  }
}
