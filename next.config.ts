import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Stripe n’est pas importé ici (initialisation lazy dans lib/stripe.ts, usage dans les handlers).
// serverExternalPackages évite de bundler le SDK côté serveur au chargement des routes.

/**
 * CSP — tunnel Sentry via même origine (/monitoring → connect-src 'self').
 * Extensions : OAuth Google ; régions EU/US *.ingest*.sentry.io ; iframes Stripe (checkout / Identity).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // L5 (sécurité) — CHANTIER DÉDIÉ : durcir la CSP avec des nonces (Next 16 les supporte)
  // pour retirer 'unsafe-inline' / 'unsafe-eval'. NON fait ici volontairement : le passage
  // aux nonces touche le rendu (scripts/styles inline de Next, Stripe.js, hydratation) et
  // doit être validé page par page pour ne rien casser. À traiter dans un ticket isolé,
  // avec Report-Only en préprod avant enforcement. Voir docs sécurité.
  [
    "script-src",
    "'self'",
    "'unsafe-eval'",
    "'unsafe-inline'",
    "https://js.stripe.com",
  ].join(" "),
  [
    "style-src",
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ].join(" "),
  ["font-src", "'self'", "data:", "https://fonts.gstatic.com"].join(" "),
  ["img-src", "'self'", "data:", "https:", "blob:"].join(" "),
  [
    "connect-src",
    "'self'",
    "https://api.stripe.com",
    "https://polygon-mainnet.g.alchemy.com",
    "https://api.anthropic.com",
    "https://*.ingest.sentry.io",
    "https://*.ingest.de.sentry.io",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
    "https://www.googleapis.com",
  ].join(" "),
  [
    "frame-src",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
    "https://*.stripe.com",
    "https://accounts.google.com",
  ].join(" "),
  "worker-src blob:",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["stripe"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "brnb-tech",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
