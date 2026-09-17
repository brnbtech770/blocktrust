// GET /api/contacts/google/start — OAuth People API one-shot (hors login).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { assertDashboardMutationAllowed } from "@/lib/require-email-verified";
import { checkRateLimitGoogleContactsStartAsync } from "@/lib/rate-limit-sensitive";
import {
  GOOGLE_CONTACTS_OAUTH_COOKIE_PKCE,
  GOOGLE_CONTACTS_OAUTH_COOKIE_STATE,
  buildGoogleContactsAuthUrl,
  generateGoogleOAuthPkce,
  getGoogleOAuthClientConfig,
  googleContactsRedirectUri,
  googleOAuthCookieOptions,
} from "@/lib/google-contacts";

export const dynamic = "force-dynamic";

function dashboardRedirect(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/dashboard/entities";
  url.search = "";
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    const signin = req.nextUrl.clone();
    signin.pathname = "/auth/signin";
    signin.search = "";
    signin.searchParams.set("callbackUrl", "/dashboard/entities");
    return NextResponse.redirect(signin);
  }

  const mutationGuard = await assertDashboardMutationAllowed(
    session.user.id,
    session.user.email,
  );
  if (!mutationGuard.ok) {
    return dashboardRedirect(req, { importError: mutationGuard.code.toLowerCase() });
  }

  const google = getGoogleOAuthClientConfig();
  if (!google) {
    return dashboardRedirect(req, { importError: "config" });
  }

  const rl = await checkRateLimitGoogleContactsStartAsync(session.user.id);
  if (!rl.ok) {
    return dashboardRedirect(req, { importError: "rate" });
  }

  const { state, verifier, challenge } = generateGoogleOAuthPkce();
  const redirectUri = googleContactsRedirectUri();
  const authUrl = buildGoogleContactsAuthUrl({
    clientId: google.clientId,
    state,
    codeChallenge: challenge,
    redirectUri,
  });

  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.redirect(authUrl);
  const cookieOpts = googleOAuthCookieOptions(secure);
  res.cookies.set(GOOGLE_CONTACTS_OAUTH_COOKIE_STATE, state, cookieOpts);
  res.cookies.set(GOOGLE_CONTACTS_OAUTH_COOKIE_PKCE, verifier, cookieOpts);
  return res;
}
