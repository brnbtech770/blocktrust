import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const allowedEmails = (process.env.ALLOWED_ADMIN_EMAILS || "brnbtech@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userEmail = typeof token.email === "string" ? token.email.toLowerCase() : "";
    if (!allowedEmails.includes(userEmail)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
