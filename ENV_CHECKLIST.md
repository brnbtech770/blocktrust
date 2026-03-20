# Checklist des variables d'environnement

## Production (Vercel)

- Déployer le **dernier commit** : `/api/debug-auth` doit inclure `debugAuthVersion: 2` et `layoutDiagnostic`. S’ils manquent, la prod n’a pas le code de debug récent.
- Recommandé : définir **`AUTH_SECRET`** avec **la même valeur** que `NEXTAUTH_SECRET` (Auth.js v5 cite souvent `AUTH_SECRET` ; la config lit les deux, mais tout définir évite les ambiguïtés).
- Optionnel : `BT_DEBUG_RING_SECRET` (≥16 caractères) pour lire `/api/debug/agent-log-recent` en prod avec `Authorization: Bearer …`.

## Variables requises pour NextAuth

Vérifiez que votre fichier `.env.local` contient **exactement** ces variables :

```env
# NextAuth - REQUIS
NEXTAUTH_SECRET="votre-secret-ici"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth - REQUIS
GOOGLE_CLIENT_ID="votre-client-id-google"
GOOGLE_CLIENT_SECRET="votre-client-secret-google"

# JWT - REQUIS
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
BLOCKTRUST_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"

# Emails transactionnels (Resend) - optionnel en dev
RESEND_API_KEY="re_..."

# Sécurité / hachage IP (recommandé en prod)
IP_HASH_SALT="secret-dédié-ne-pas-réutiliser-nextauth"

# Liaison automatique Google ↔ compte même email (désactivé par défaut — risque takeover)
# Mettre "true" seulement si vous en avez besoin explicitement
# ALLOW_DANGEROUS_EMAIL_LINKING="true"

# Stripe — webhooks
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_IDENTITY_WEBHOOK_SECRET="whsec_..."
```

## Comment générer NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copiez le résultat dans `.env.local` :
```env
NEXTAUTH_SECRET="le-résultat-de-la-commande-ci-dessus"
```

## Format des clés JWT

Les clés JWT doivent être au format PEM avec `\n` (backslash + n) pour les retours à la ligne.

**Exemple correct :**
```env
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...\n-----END PRIVATE KEY-----\n"
```

**❌ Incorrect :**
```env
# Ne pas utiliser de vrais retours à la ligne
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----"
```

## Vérification rapide

Exécutez ce script pour vérifier vos variables :

```bash
node scripts/diagnose-auth.js
```

Ou vérifiez manuellement dans votre `.env.local` :

1. ✅ `NEXTAUTH_SECRET` existe et n'est pas vide
2. ✅ `NEXTAUTH_URL=http://localhost:3000`
3. ✅ `GOOGLE_CLIENT_ID` existe et n'est pas vide
4. ✅ `GOOGLE_CLIENT_SECRET` existe et n'est pas vide
5. ✅ `BLOCKTRUST_JWT_PRIVATE_KEY` contient `BEGIN PRIVATE KEY` et `END PRIVATE KEY`
6. ✅ `BLOCKTRUST_JWT_PUBLIC_KEY` contient `BEGIN PUBLIC KEY` et `END PUBLIC KEY`
7. ✅ Les clés JWT utilisent `\n` (backslash + n) et non de vrais retours à la ligne
8. ✅ `RESEND_API_KEY` (optionnel) : emails transactionnels. Sans elle, les emails ne partent pas (mot de passe oublié **n’est pas** loggé en clair).
9. ✅ `STRIPE_WEBHOOK_SECRET` et `STRIPE_IDENTITY_WEBHOOK_SECRET` en production.
10. ✅ `IP_HASH_SALT` recommandé (sinon dérivation liée à `NEXTAUTH_SECRET` côté hash IP uniquement).
11. ⚠️ `ALLOW_DANGEROUS_EMAIL_LINKING=true` : uniquement si vous devez lier Google à un compte email/mot de passe existant (voir `SECURITY.md`).

## Emails transactionnels (Resend)

Pour activer l’envoi d’emails (bienvenue, certificats, alerte fraude, paiement) :

1. Créez un compte sur [resend.com](https://resend.com) et vérifiez le domaine `blocktrust.tech` (ou utilisez le domaine de test en dev).
2. Dans le dashboard Resend, créez une clé API et ajoutez-la dans `.env.local` :
   ```env
   RESEND_API_KEY="re_..."
   ```
3. L’expéditeur par défaut est `BlockTrust <noreply@blocktrust.tech>` (à configurer côté Resend si besoin).

Sans `RESEND_API_KEY`, l’app fonctionne mais les envois d’e-mails ne sont pas effectués (aucun secret de reset en log).

Voir aussi **`SECURITY.md`** pour l’audit et les choix de durcissement.

## Erreurs courantes

### "Internal Server Error" sur /api/auth/session

**Causes possibles :**
1. `NEXTAUTH_SECRET` manquant ou vide
2. `NEXTAUTH_URL` incorrect
3. Clés JWT mal formatées (vrais retours à la ligne au lieu de `\n`)
4. Problème de connexion à la base de données

**Solution :**
1. Vérifiez que `NEXTAUTH_SECRET` est défini
2. Vérifiez le format des clés JWT (doivent utiliser `\n`)
3. Redémarrez le serveur : `npm run dev`
