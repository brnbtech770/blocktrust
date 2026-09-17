// GET /api/contacts/google/callback — échange code, fetch People API, cache preview (sans token).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { saveGoogleContactsPreview } from "@/lib/contacts-google-preview-store";
import {
  GOOGLE_CONTACTS_OAUTH_COOKIE_PKCE,
  GOOGLE_CONTACTS_OAUTH_COOKIE_STATE,
  exchangeGoogleContactsCode,
  fetchGoogleContactsPreview,
  getGoogleOAuthClientConfig,
  googleContactsRedirectUri,
  googleOAuthCookieOptions,
  timingSafeStringEqual,
} from "@/lib/google-contacts";

export const dynamic = "force-dynamic";

function dashboardRedirect(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/dashboard/entities";
  url.search = "";
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = NextResponse.redirect(url);
  clearOauthCookies(res);
  return res;
}

function clearOauthCookies(res: NextResponse): void {
  const secure = process.env.NODE_ENV === "production";
  const opts = { ...googleOAuthCookieOptions(secure), maxAge: 0 };
  res.cookies.set(GOOGLE_CONTACTS_OAUTH_COOKIE_STATE, "", opts);
  res.cookies.set(GOOGLE_CONTACTS_OAUTH_COOKIE_PKCE, "", opts);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    const signin = req.nextUrl.clone();
    signin.pathname = "/auth/signin";
    signin.search = "";
    signin.searchParams.set("callbackUrl", "/dashboard/entities");
    const res = NextResponse.redirect(signin);
    clearOauthCookies(res);
    return res;
  }

  const googleError = req.nextUrl.searchParams.get("error");
  if (googleError) {
    return dashboardRedirect(req, {
      importError: googleError === "access_denied" ? "denied" : "oauth",
    });
  }

  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = req.nextUrl.searchParams.get("state")?.trim() ?? "";
  const cookieState = req.cookies.get(GOOGLE_CONTACTS_OAUTH_COOKIE_STATE)?.value ?? "";
  const verifier = req.cookies.get(GOOGLE_CONTACTS_OAUTH_COOKIE_PKCE)?.value ?? "";

  if (!code || !state || !cookieState || !verifier || !timingSafeStringEqual(state, cookieState)) {
    return dashboardRedirect(req, { importError: "state" });
  }

  const google = getGoogleOAuthClientConfig();
  if (!google) {
    return dashboardRedirect(req, { importError: "config" });
  }

  let accessToken: string;
  try {
    const exchanged = await exchangeGoogleContactsCode({
      code,
      verifier,
      redirectUri: googleContactsRedirectUri(),
      clientId: google.clientId,
      clientSecret: google.clientSecret,
    });
    accessToken = exchanged.accessToken;
  } catch {
    console.warn("[gcontacts] token exchange failed");
    return dashboardRedirect(req, { importError: "token" });
  }

  try {
    const contacts = await fetchGoogleContactsPreview(accessToken);
    await saveGoogleContactsPreview(session.user.id, contacts);
  } catch {
    console.warn("[gcontacts] People API fetch failed");
    return dashboardRedirect(req, { importError: "people" });
  }

  return dashboardRedirect(req, { import: "google" });
}
