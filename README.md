# BlockTrust — Next.js 14 Monorepo (App Router) — Structure

> Stack: **Next.js 14**, **tRPC**, **Prisma**, **Supabase**, **Payments** (Stripe recommandé)  
> Features: **Auth**, **Entities**, **Certificates**, **Payments**, **Admin**

---

## Arborescence (proposée)

```txt
blocktrust/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ (public)/
│     │  │  │  ├─ page.tsx
│     │  │  │  ├─ pricing/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ verify/
│     │  │  │  │  └─ [badgeId]/
│     │  │  │  │     └─ page.tsx
│     │  │  │  ├─ api/
│     │  │  │  │  ├─ trpc/
│     │  │  │  │  │  └─ [trpc]/
│     │  │  │  │  │     └─ route.ts
│     │  │  │  │  └─ webhook/
│     │  │  │  │     └─ stripe/
│     │  │  │  │        └─ route.ts
│     │  │  │  └─ legal/
│     │  │  │     ├─ privacy/
│     │  │  │     │  └─ page.tsx
│     │  │  │     └─ terms/
│     │  │  │        └─ page.tsx
│     │  │  ├─ (auth)/
│     │  │  │  ├─ login/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ register/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ reset-password/
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ callback/
│     │  │  │     └─ page.tsx
│     │  │  ├─ (app)/
│     │  │  │  ├─ layout.tsx
│     │  │  │  ├─ dashboard/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ entities/
│     │  │  │  │  ├─ page.tsx
│     │  │  │  │  └─ [entityId]/
│     │  │  │  │     └─ page.tsx
│     │  │  │  ├─ certificates/
│     │  │  │  │  ├─ page.tsx
│     │  │  │  │  └─ [certificateId]/
│     │  │  │  │     └─ page.tsx
│     │  │  │  ├─ billing/
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ settings/
│     │  │  │     └─ page.tsx
│     │  │  ├─ admin/
│     │  │  │  ├─ layout.tsx
│     │  │  │  ├─ page.tsx
│     │  │  │  ├─ users/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ entities/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ certificates/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ payments/
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ webhooks/
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ audit-logs/
│     │  │  │     └─ page.tsx
│     │  │  └─ layout.tsx
│     │  ├─ components/
│     │  │  ├─ ui/
│     │  │  ├─ layout/
│     │  │  ├─ auth/
│     │  │  ├─ entities/
│     │  │  ├─ certificates/
│     │  │  └─ billing/
│     │  ├─ server/
│     │  │  ├─ api/
│     │  │  │  ├─ trpc.ts
│     │  │  │  ├─ root.ts
│     │  │  │  └─ routers/
│     │  │  │     ├─ auth.router.ts
│     │  │  │     ├─ entities.router.ts
│     │  │  │     ├─ certificates.router.ts
│     │  │  │     ├─ billing.router.ts
│     │  │  │     ├─ admin.router.ts
│     │  │  │     └─ audit.router.ts
│     │  │  ├─ db/
│     │  │  │  └─ prisma.ts
│     │  │  ├─ auth/
│     │  │  │  ├─ supabase.server.ts
│     │  │  │  └─ session.ts
│     │  │  ├─ billing/
│     │  │  │  ├─ stripe.ts
│     │  │  │  └─ plans.ts
│     │  │  ├─ security/
│     │  │  │  ├─ rateLimit.ts
│     │  │  │  └─ webhookSignature.ts
│     │  │  └─ config.ts
│     │  ├─ lib/
│     │  │  ├─ supabase/
│     │  │  │  ├─ client.ts
│     │  │  │  └─ middleware.ts
│     │  │  ├─ trpc/
│     │  │  │  ├─ client.ts
│     │  │  │  └─ react.tsx
│     │  │  ├─ validators/
│     │  │  │  ├─ entity.schema.ts
│     │  │  │  └─ certificate.schema.ts
│     │  │  └─ utils.ts
│     │  ├─ middleware.ts
│     │  ├─ styles/
│     │  │  └─ globals.css
│     │  └─ types/
│     │     └─ index.ts
│     ├─ public/
│     │  ├─ brand/
│     │  └─ images/
│     ├─ next.config.mjs
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ .env.example
├─ packages/
│  ├─ shared/
│  │  ├─ src/
│  │  │  ├─ constants.ts
│  │  │  ├─ types.ts
│  │  │  └─ zod.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ ui/
│     ├─ src/
│     │  ├─ button.tsx
│     │  ├─ input.tsx
│     │  └─ index.ts
│     ├─ package.json
│     └─ tsconfig.json
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ supabase/
│  ├─ migrations/
│  ├─ functions/
│  └─ config.toml
├─ scripts/
│  ├─ setup-env.ts
│  └─ verify-webhook.ts
├─ docs/
│  ├─ API.md
│  ├─ SECURITY.md
│  ├─ DB_SCHEMA.md
│  └─ ROADMAP.md
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ release.yml
├─ docker/
│  ├─ Dockerfile.web
│  └─ docker-compose.yml
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
└─ turbo.json
