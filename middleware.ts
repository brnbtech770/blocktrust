import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAILS = ["brnbtech@gmail.com"];

const PUBLIC_PATHS = ["/login", "/register", "/api", "/verify", "/v", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    const userEmail = typeof token?.email === "string" ? token.email : "";
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.redirect(new URL("/mon-espace", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
