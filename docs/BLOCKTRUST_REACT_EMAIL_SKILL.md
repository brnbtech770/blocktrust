# BLOCKTRUST — Skill React Email
## Templates email, badge HTML, compatibilité clients

---

## 1. STRUCTURE D'UN TEMPLATE

```tsx
// emails/MonEmail.tsx
import {
  Body, Button, Container, Head, Heading,
  Hr, Html, Img, Link, Preview, Section,
  Text, Row, Column
} from '@react-email/components'

interface MonEmailProps {
  userName: string
  certifyUrl: string
}

export default function MonEmail({ userName, certifyUrl }: MonEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre badge BLOCKTRUST est prêt</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>BLOCKTRUST™</Text>
          </Section>
          
          {/* Contenu */}
          <Section style={content}>
            <Heading style={h1}>Bonjour {userName}</Heading>
            <Text style={paragraph}>
              Votre badge certifié est disponible.
            </Text>
            <Button href={certifyUrl} style={button}>
              Vérifier mon badge
            </Button>
          </Section>
          
          {/* Footer */}
          <Hr style={hr} />
          <Text style={footer}>
            BLOCKTRUST™ · Solution française de certification d'identité
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

## 2. RÈGLE CRITIQUE — URL DE VÉRIFICATION

### Format OBLIGATOIRE (public, sans compte)
```typescript
// ✅ CORRECT — accessible sans compte
const verifyUrl = `https://blocktrust.tech/verify?certId=${encodeURIComponent(publicId || certificateId)}`

// ❌ INCORRECT — exige une session connectée
const verifyUrl = `https://blocktrust.tech/verify/${certificateId}`

// ❌ INCORRECT — exige session + abonnement
const verifyUrl = `https://blocktrust.tech/verify/${jti}`
```

### Quelle valeur utiliser comme certId ?
```typescript
// Ordre de priorité :
const certId = certificate.publicId  // préféré si disponible
  ?? certificate.id                  // fallback UUID interne

const verifyUrl = `https://blocktrust.tech/verify?certId=${encodeURIComponent(certId)}`
```

---

## 3. BADGE HTML DANS LES EMAILS

### Le composant BlockTrustBadge.tsx NE fonctionne PAS dans les emails
Les emails n'exécutent pas JavaScript — pas d'animations SVG.

### Badge HTML statique compatible email
```tsx
// Badge simple compatible tous clients email
function EmailBadge({ verifyUrl }: { verifyUrl: string }) {
  return (
    <Section style={{ textAlign: 'center', padding: '20px 0' }}>
      <Link href={verifyUrl} style={{ textDecoration: 'none' }}>
        <table
          align="center"
          style={{
            background: 'linear-gradient(135deg, #0d1f3c, #0a1628)',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'inline-block',
          }}
        >
          <tr>
            <td style={{ textAlign: 'center' }}>
              <Text style={{
                color: '#00d4ff',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                margin: '0 0 4px 0',
                fontFamily: 'Inter, Arial, sans-serif',
              }}>
                BLOCKTRUST™
              </Text>
              <Text style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '10px',
                margin: '0',
                fontFamily: 'Inter, Arial, sans-serif',
              }}>
                Identité certifiée · Cliquez pour vérifier
              </Text>
            </td>
          </tr>
        </table>
      </Link>
      <Text style={{
        color: 'rgba(255,255,255,0.3)',
        fontSize: '10px',
        marginTop: '8px',
        fontFamily: 'monospace',
      }}>
        {verifyUrl}
      </Text>
    </Section>
  )
}
```

---

## 4. STYLES COMPATIBLES EMAIL

### Règles de compatibilité
```typescript
// ✅ Toujours inline styles (pas de classes CSS)
// ✅ Tables pour le layout (pas de flexbox)
// ✅ Fonts : Arial, Inter avec fallback
// ✅ Images hébergées (pas de base64)
// ✅ Largeur max 600px pour le container
// ❌ Pas de CSS grid
// ❌ Pas de flexbox
// ❌ Pas de CSS variables
// ❌ Pas de SVG animé
// ❌ Pas de JavaScript
```

### Styles de base BLOCKTRUST
```typescript
const body = {
  backgroundColor: '#0a1628',
  fontFamily: 'Inter, Arial, sans-serif',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px 20px',
}

const header = {
  borderBottom: '1px solid rgba(0,212,255,0.2)',
  paddingBottom: '20px',
  marginBottom: '30px',
}

const logo = {
  color: '#00d4ff',
  fontSize: '18px',
  fontWeight: '700',
  letterSpacing: '0.1em',
  margin: '0',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 16px 0',
}

const paragraph = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
}

const button = {
  backgroundColor: '#00d4ff',
  color: '#0a1628',
  fontSize: '14px',
  fontWeight: '700',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}

const hr = {
  borderColor: 'rgba(255,255,255,0.1)',
  margin: '30px 0',
}

const footer = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '11px',
  textAlign: 'center' as const,
}
```

---

## 5. TEMPLATES EXISTANTS BLOCKTRUST

```
emails/
├── CertificateAnchoredEmail.tsx   → Ancrage Polygon confirmé
├── CertificateCreatedEmail.tsx    → Badge créé
├── PaymentConfirmationEmail.tsx   → Paiement confirmé
├── KYCApprovedEmail.tsx           → Vérification approuvée
├── KYCRejectedEmail.tsx           → Vérification rejetée
├── TrustCircleInviteEmail.tsx     → Invitation réseau
├── TrustCircleConfirmedEmail.tsx  → Confirmation réseau
├── ManualTrustRequestEmail.tsx    → Demande manuelle
├── MagicLinkEmail.tsx             → Lien connexion
└── PasswordResetEmail.tsx         → Réinitialisation
```

---

## 6. ENVOI VIA RESEND

```typescript
import { Resend } from 'resend'
import MonEmail from '@/emails/MonEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'BLOCKTRUST <contact@blocktrust.tech>',
  to: [userEmail],
  subject: 'Votre badge BLOCKTRUST est prêt',
  react: MonEmail({ userName, certifyUrl }),
})
```

### Domaine vérifié Resend
```
contact@blocktrust.tech ✅ SPF/DKIM/DMARC configurés
support@blocktrust.tech ✅
security@blocktrust.tech ✅
```

---

## 7. PREVIEW EN LOCAL

```bash
# Lancer le serveur de preview React Email
npx react-email dev --dir emails --port 3001
# → http://localhost:3001
```

---

## 8. ANTI-PATTERNS

```tsx
// ❌ CSS classes (ignorées dans les clients email)
<Text className="text-cyan-400">

// ✅ Inline styles uniquement
<Text style={{ color: '#00d4ff' }}>

// ❌ URL /verify/[id] (exige session)
href={`/verify/${id}`}

// ✅ URL /verify?certId= (public)
href={`https://blocktrust.tech/verify?certId=${certId}`}

// ❌ SVG animé (ne fonctionne pas dans email)
<BlockTrustBadge size={120} />

// ✅ Badge HTML statique
<EmailBadge verifyUrl={verifyUrl} />
```

*Document généré le 7 mai 2026 — BLOCKTRUST React Email Skill*
