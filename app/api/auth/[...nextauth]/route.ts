import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import type { JWT } from "next-auth/jwt";
import type { User, Session } from "next-auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
