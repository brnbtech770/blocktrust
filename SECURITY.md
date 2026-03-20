# Audit sécurité (BlockTrust MVP)

Résumé des risques identifiés et des mesures appliquées dans le code.

## Corrections appliquées

| Risque | Fichier(s) | Mesure |
|--------|------------|--------|
| Bypass auth si `auth()` échouait dans le middleware | `app/middleware.ts` | **Fail-closed** : 503 sur routes protégées au lieu de `next()`. |
| Contournement via `x-user-id` / cookie `user-id` si `getAuthUser` échouait | `app/lib/auth.ts` | **Suppression du fallback** ; uniquement la session NextAuth. |
| Session OAuth sans `sub` si l’upsert DB échouait | `app/lib/auth.ts` | `throw` dans le `catch` JWT (pas de token partiel). |
| Open redirect sur `redirect` callback | `app/lib/auth.ts` | Vérification **origine identique** ou chemin **relatif** (`/`). |
| Liaison automatique Google ↔ même email (account takeover) | `app/lib/auth.ts` | `allowDangerousEmailAccountLinking` **désactivé par défaut** ; activer avec `ALLOW_DANGEROUS_EMAIL_LINKING=true` si besoin métier. |
| Fuite de jeton reset dans les logs | `app/api/auth/forgot-password/route.ts` | Plus de log du lien ; message d’erreur générique si Resend absent. |
| Webhook Stripe sans secret configuré | `app/api/stripe/webhook/route.ts` | Refus explicite **500** si `STRIPE_WEBHOOK_SECRET` vide. |
| Noms de fichiers upload (path / caractères) | `app/api/upload/route.ts` | **Sanitisation** du nom avant clé Blob. |
| Bug logique `checkPlanFeature('unlimited')` | `app/lib/auth.ts` | Parenthèses corrigées (évitait d’accorder `unlimited` à d’autres features). |
| Sel IP faible par défaut | `app/lib/auth.ts` | En production, dérivation depuis `NEXTAUTH_SECRET` si `IP_HASH_SALT` absent ; **préférer** `IP_HASH_SALT` dédié. |

## Recommandations opérationnelles

- Définir **`IP_HASH_SALT`** (secret dédié, pas stocké en clair dans le repo).
- **`NEXTAUTH_SECRET`**, **`STRIPE_WEBHOOK_SECRET`**, clés Stripe : uniquement via variables d’environnement secrètes.
- Vérifier périodiquement **`npm audit`** et dépendances.
- Les routes `/api/admin/*`, `/api/v2/*`, `/api/trust-circle/*`, `/api/upload` ne passent pas par le middleware : chaque handler doit continuer d’appeler `auth()` / `isAdmin()` comme aujourd’hui.

## Variables d’environnement liées

Voir `ENV_CHECKLIST.md` et notamment :

- `ALLOW_DANGEROUS_EMAIL_LINKING` — `true` seulement si vous acceptez la liaison auto Google / email identique.
- `IP_HASH_SALT` — recommandé en production.
- `STRIPE_WEBHOOK_SECRET` — obligatoire pour accepter les webhooks.
