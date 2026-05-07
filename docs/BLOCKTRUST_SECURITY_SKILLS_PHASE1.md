# BLOCKTRUST — Skills Sécurité Phase 1

## Avant premier client B2B

**Usage :** référence pour Cursor, revues de code et onboarding sécurité. Complète [`SECURITY.md`](../SECURITY.md) (état réel du dépôt). Le fichier réseau Edge actuel est [`proxy.ts`](../proxy.ts) (ex-`middleware` Next.js 16).

---

## 1. OWASP Top 10

### IDOR (Insecure Direct Object Reference)

**Règle :** Toujours vérifier que l'objet appartient à `session.user.id`

```typescript
// ❌ DANGEREUX
const cert = await prisma.certificate.findUnique({
  where: { id: params.id }
})

// ✅ CORRECT
const cert = await prisma.certificate.findFirst({
  where: {
    id: params.id,
    entity: { userId: session.user.id }, // ownership check
  },
})
```

> Préférer `findFirst` avec clause imbriquée ou `updateMany` avec les mêmes filtres pour éviter les races entre lecture et écriture.

### Mass Assignment

**Règle :** Whitelister explicitement les champs acceptés

```typescript
// ❌ DANGEREUX
await prisma.user.update({
  where: { id: userId },
  data: req.body // n'importe quel champ
})

// ✅ CORRECT
const { name, email } = validatedBody // ex. via Zod .pick()
await prisma.user.update({
  where: { id: userId },
  data: { name, email } // seulement ces champs
})
```

### XSS Prevention

**Règle :** Ne jamais injecter du HTML non sanitisé

```typescript
// ❌ DANGEREUX
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT
<div>{userInput}</div> // React escape automatiquement
// Si HTML nécessaire : utiliser DOMPurify
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

### SQL Injection (via Prisma)

**Règle :** Utiliser l’API Prisma ou `$queryRaw` **tagged template** (paramètres liés). Jamais concaténer des chaînes dans du SQL brut.

```typescript
// ❌ DANGEREUX — concaténation / Prisma.raw utilisateur
await prisma.$executeRawUnsafe(`SELECT * FROM "User" WHERE id = '${userId}'`)

// ✅ CORRECT — tagged template : valeurs passées comme paramètres liés
await prisma.$queryRaw`SELECT * FROM "User" WHERE id = ${userId}`

// Encore mieux si pas besoin de SQL brut :
await prisma.user.findUnique({ where: { id: userId } })
```

---

## 2. RGPD / Privacy by Design

### Data Minimization

**Règle :** Ne collecter que ce qui est strictement nécessaire

```typescript
// ❌ DANGEREUX — trop de données
const user = await prisma.user.findUnique({
  where: { id: userId },
  // retourne tout y compris passwordHash, etc.
})

// ✅ CORRECT — sélection minimale
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, name: true, email: true, plan: true },
})
```

### IP Hashing (RGPD)

**Règle :** Éviter de stocker une IP en clair dans les journaux ou la DB ; si besoin d’un lien stable, utiliser un hash avec secret serveur (comme `hashIp` dans le projet).

```typescript
import { createHash } from 'crypto'

function hashIP(ip: string, pepper: string): string {
  return createHash('sha256')
    .update(ip + pepper)
    .digest('hex')
}

// pepper = secret serveur (ex. NEXTAUTH_SECRET ou secret dédié RGPD)
ipHash: hashIP(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown', process.env.IP_HASH_PEPPER!)
```

### Droit à l'effacement

**Règle :** Modèle de données avec `onDelete: Cascade` là où le métier l’exige ; procédures d’export / suppression documentées.

```prisma
model User {
  id           String        @id
  certificates Certificate[]
}

model Certificate {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

*(Adapter au schéma réel : relations via `Entity`, etc.)*

### Logs sans données sensibles

**Règle :** Ne pas logger d’emails complets, tokens, corps de webhooks ou headers bruts en production.

```typescript
// ❌ DANGEREUX
console.log(`User ${user.email} verified cert ${certId}`)

// ✅ CORRECT
console.log(`[verify] userId=${userId.slice(0, 8)}… cert=${certId.slice(0, 8)}…`)
```

---

## 3. Input Validation / Sanitization

### Validation SIRET

```typescript
function isValidSIRET(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false
  // Algorithme de Luhn
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(siret[i]!, 10)
    if (i % 2 === 0) digit *= 2
    if (digit > 9) digit -= 9
    sum += digit
  }
  return sum % 10 === 0
}
```

Compléter par une vérification métier (ex. API INSEE) lorsque nécessaire.

### Validation Email

```typescript
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.length <= 254
}
```

*(En projet : préférer Zod `z.string().email()`.)*

### SSRF Prevention

```typescript
// Valider les URLs avant fetch externe
function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url)
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
    if (blocked.some((b) => parsed.hostname === b || parsed.hostname.endsWith(`.${b}`))) {
      return false
    }
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

Durcir avec blocage des plages RFC1918 / lien-local si les métier autorise les résolutions DNS vers IP privées.

---

## 4. JWT / Cryptographie

### Constant-Time Comparison

```typescript
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
```

### JWT Expiry et Revocation

```typescript
// Vérifier expiry + liste de révocation si besoin métier
async function verifyJWT(token: string) {
  const payload = await jose.jwtVerify(token, publicKey)

  const revoked = await redis.get(`revoked:${payload.payload.jti}`)
  if (revoked) throw new Error('Token révoqué')

  return payload
}
```

Ne pas utiliser `Math.random` pour des identifiants de sécurité ; préférer `crypto.randomBytes` / `randomUUID`.

---

## 5. Rate Limiting Avancé

### Lock Redis pour quotas (race condition)

```typescript
import { redis } from '@/lib/redis'

async function acquireQuotaLock(userId: string): Promise<boolean> {
  const key = `quota:lock:${userId}`
  const acquired = await redis.set(key, '1', { NX: true, EX: 5 })
  return acquired === 'OK'
}

async function releaseQuotaLock(userId: string): Promise<void> {
  await redis.del(`quota:lock:${userId}`)
}

// Usage dans la route de création de certificat
const locked = await acquireQuotaLock(session.user.id)
if (!locked) {
  return NextResponse.json(
    { error: 'Requête en cours, réessayez dans quelques secondes' },
    { status: 429 }
  )
}
try {
  // créer le certificat
} finally {
  await releaseQuotaLock(session.user.id)
}
```

### Rate limit KYC spécifique

```typescript
// KYC coûteux — rate limit strict
export const kycRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 tentatives/heure
  prefix: 'bt:kyc',
})
```

---

## 6. Stripe Security

### Webhook Idempotence

```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  const existing = await redis.get(`stripe:event:${event.id}`)
  if (existing) {
    console.log(`[stripe] Event ${event.id} déjà traité`)
    return
  }

  await processStripeEvent(event)

  await redis.set(`stripe:event:${event.id}`, '1', { EX: 86400 })
}
```

### Vérification signature webhook

```typescript
const sig = request.headers.get('stripe-signature')!
let event: Stripe.Event

try {
  const body = await request.text()
  event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
} catch {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

---

## 7. Secrets Management

### Règles absolues

- Jamais de secret dans le code source
- Jamais de secret dans les logs
- Jamais de secret dans les réponses API
- Rotation si compromission suspectée

### Variables à protéger (Vercel Sensitive)

```
STRIPE_SECRET_KEY              ← Sensitive + Production only
BLOCKTRUST_JWT_PRIVATE_KEY      ← Sensitive + Production only
POLYGON_PRIVATE_KEY             ← Sensitive + Production only
NEXTAUTH_SECRET / AUTH_SECRET   ← Sensitive + Production only
ANTHROPIC_API_KEY               ← Sensitive + Production only
UPSTASH_REDIS_REST_TOKEN        ← Sensitive + Production only
CRON_SECRET                     ← Sensitive + Production only
STRIPE_WEBHOOK_SECRET           ← Sensitive + Production only
```

### Rotation d'urgence

1. Révoquer immédiatement dans le service concerné  
2. Générer un nouveau secret  
3. Mettre à jour dans Vercel (ou équivalent)  
4. Redéployer  
5. Auditer les logs pour détecter une utilisation frauduleuse  

---

## 8. Next.js Security Headers

```typescript
// next.config.ts — exemple à adapter au projet (CSP + intégrations tierces)
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // CSP : ajuster selon Stripe, OAuth Google, Sentry, etc.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; '),
  },
]
```

---

## 9. Open Redirect Prevention (NextAuth)

```typescript
function isSafeCallbackUrl(url: string, allowedHost: string): boolean {
  try {
    const parsed = new URL(url, `https://${allowedHost}`)
    return parsed.hostname === allowedHost
  } catch {
    return false
  }
}
```

---

## 10. Rappels issus de l’audit Phase 1 (interne)

À garder en tête lors des PR :

- Ne pas exposer d’endpoint de diagnostic auth en production sans garde-fou.
- Aligner les transitions de statut certificat (utilisateur vs admin) avec le flux métier documenté.
- Éviter les doubles appels à la génération de secrets (ex. paire clé / hash API).
- Désactiver ou restreindre tout endpoint listant emails / IDs / headers complets.

---

*Document mis à jour le 6 mai 2026 — BLOCKTRUST Security Skills Phase 1*
