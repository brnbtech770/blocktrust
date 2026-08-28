# CLAUDE.md — BLOCKTRUST MASTER OPERATING RULES

Tu es l'agent technique principal du projet **BlockTrust**.

Tu dois comprendre, auditer, maintenir, corriger et faire évoluer directement le projet BlockTrust à partir du repository, de la documentation et des outils réellement disponibles.

Tu dois toujours privilégier l'existant réel du repository aux hypothèses générales.

# 1. STACK TECHNIQUE RÉELLE

BlockTrust utilise notamment :

* Next.js
* React
* TypeScript
* routes API Next.js directes
* Prisma
* PostgreSQL / Neon (bold-frost)
* Upstash Redis
* Resend
* Cloudflare Turnstile
* Stripe
* ethers
* Polygon Mainnet
* Alchemy
* Vercel (Pro)
* GitHub
* extension Chrome BlockTrust TrustScan
* Sentry
* AbuseIPDB

IMPORTANT :

BlockTrust **n'utilise pas tRPC**.

Ne jamais introduire tRPC sauf décision architecturale explicitement validée.

Avant toute intervention, inspecte toujours :

* `package.json`
* `prisma/schema.prisma`
* les routes API existantes
* les services métier existants
* les helpers centraux (`lib/`)
* les scripts internes (`scripts/`)
* les règles documentées dans le repository

Le repository constitue la source de vérité.

# 2. INVARIANTS ABSOLUS DU PROJET

Les règles suivantes sont considérées comme des invariants.

Tu ne dois pas les remettre en cause, les simplifier ou les supprimer sans instruction explicite.

## PlanType legacy

L'enum legacy `PlanType` et les mappings runtime associés (auth.ts, webhook, checkout, subscription) sont INTOUCHABLES.

Ne jamais :

* renommer ses valeurs ;
* supprimer ses valeurs ;
* remplacer brutalement son usage ;
* effectuer une migration destructive liée à cet enum.

Les valeurs legacy dans l'enum PostgreSQL `ValidationLevel` :

* BRONZE
* SILVER
* GOLD
* PLATINUM

sont considérées comme des **fossiles PostgreSQL**.

Elles peuvent ne plus avoir de rôle produit actif, mais elles doivent rester compatibles avec l'historique de la base.

NE JAMAIS LES SUPPRIMER.

## entityType/accountType BUSINESS

Le concept `entityType = 'BUSINESS'` et `accountType = 'BUSINESS'` sont des concepts entreprise valides dans le modèle de données.

NE JAMAIS les supprimer ni les renommer.

# 3. MIGRATIONS DATABASE

Après CHAQUE migration Prisma ou modification structurelle DB :

1. Exécuter `npx prisma migrate deploy`
2. Exécuter `npx tsx scripts/sync-db-columns.ts`
3. Vérifier les enums PostgreSQL manuellement si des valeurs ont été ajoutées

`prisma migrate deploy` n'est PAS fiable seul sur Neon bold-frost. Le registre `_prisma_migrations` peut être à jour alors que les colonnes ou tables manquent réellement en base. Ce problème a été constaté 3 fois en production.

Le script `sync-db-columns.ts` est le filet de sécurité obligatoire.

Ne jamais considérer une migration comme terminée tant que `sync-db-columns.ts` n'a pas confirmé "aucune colonne à ajouter".

Avant toute migration :

1. inspecter le schéma actuel ;
2. identifier les données legacy ;
3. vérifier les dépendances ;
4. privilégier les migrations additives ;
5. préserver la rétrocompatibilité ;
6. prévoir un rollback lorsque pertinent ;
7. exécuter les validations nécessaires.

Ne jamais automatiquement exécuter en production :

* DROP TABLE
* TRUNCATE
* suppression globale de données
* suppression destructive de colonnes
* suppression d'enums legacy

## Table ProcessedStripeEvent

Structure fixe pour l'idempotence webhook Stripe :

* `eventId` TEXT PRIMARY KEY
* `type` TEXT NULLABLE
* `createdAt` TIMESTAMP DEFAULT now()

NE JAMAIS modifier cette structure.

# 4. PRICING FIGÉ

Le pricing BlockTrust est actuellement FIGÉ.

Aucune modification des prix, plans, limites, quotas ou appellations commerciales ne doit être effectuée avant que BlockTrust ait atteint simultanément :

* 100 utilisateurs ;
* 10 entreprises ;
* 3 mois d'exploitation correspondante.

Tant que ces conditions ne sont pas remplies :

NE PAS MODIFIER LE PRICING.

Si un problème de pricing est détecté, le documenter sans changer le modèle économique.

# 5. RÉSOLUTION DU PLAN

Pour déterminer les droits, limites ou fonctionnalités d'un utilisateur :

TOUJOURS utiliser :

`resolveEffectivePlan`

Ne jamais baser directement une décision métier sur :

* `planId`
* `session.user.plan`
* une valeur brute venant de la DB
* une propriété frontend
* une ancienne correspondance PlanType
* un fallback hardcodé (ex: `?? 'ESSENTIEL'`)

`resolveEffectivePlan` est la source de vérité métier pour le plan effectif.

Cette règle s'applique partout : API, backend, services, quotas, features, UI, extension, MCP, automatisations internes.

## Affichage UI

L'UI ne doit JAMAIS contenir de nom de plan, prix, quota ou donnée blockchain codé en dur.

Tout doit être dérivé dynamiquement via :

* `resolveEffectivePlan` (ou `resolveAccountPlan`)
* `getPlanDisplayLabel`
* `getMaxCertificates` / `getMaxEntities`
* `isInternalAccount`

Compte Découverte affiche "Découverte" partout (jamais "Essentiel").
Comptes internes affichent "Compte interne".

# 6. CERTIFICATION : FAIT OBJECTIF

Une certification BlockTrust représente un **fait objectif enregistré par le système**.

Elle ne doit JAMAIS dépendre du viewer.

La vérité d'une certification ne change pas selon qui la consulte, son niveau de plan, son appartenance au Trust Circle ou son identité côté frontend.

La présentation peut varier. Les permissions d'accès peuvent varier. Mais le fait certifié lui-même ne doit jamais être calculé différemment selon le viewer.

NE JAMAIS introduire de logique `viewer-dependent` dans la détermination d'une certification.

# 7. ROOT OF TRUST

Le principe Root of Trust est central dans BlockTrust.

Les comptes officiels sont identifiés par `isOfficialEmail()` dans `lib/official-trust.ts`.

La source est UNIQUEMENT : `DASHBOARD_ADMIN_EMAILS` + `INTERNAL_EMAILS` + `contact@blocktrust.tech`.

Le critère pour les entités est l'email PROPRE de l'Entity (pas l'ownership).

Quand `isOfficialEmail === true` → score = 100, `isOfficialAccount: true`.

Exception : un certificat RÉVOQUÉ d'un compte officiel → score = 0 (le statut révoqué prime).

Ne pas diluer cette logique dans un scoring secondaire. Ne pas recalculer arbitrairement ce score.

# 8. TROIS FLUX À NE JAMAIS CONFONDRE

Les concepts suivants sont distincts :

**CONTACT** — une référence dans le carnet d'adresses de l'utilisateur. Crée une Entity avec `userId = user courant`. Ne crée PAS de TrustRelation. Ne déclenche PAS d'invitation Trust Circle.

**TRUST CIRCLE** — une relation de confiance (MUTUAL/UNILATERAL/MANUAL). Accessible depuis un flux séparé. Nécessite plan Premium+.

**BADGE** — un certificat cryptographique émis par BlockTrust. Nécessite une Entity + un Certificate.

Ne jamais fusionner leurs logiques. Un ajout de contact ne doit JAMAIS créer automatiquement une entrée Trust Circle.

# 9. BIS

BIS ne doit JAMAIS bloquer l'envoi d'un email.

Le système peut avertir, scorer, signaler, afficher un risque, produire une information, enrichir l'expérience de confiance.

Mais BIS ne doit pas empêcher techniquement l'utilisateur d'envoyer son email.

En cas de timeout ou d'erreur lors de la signature BIS : l'email part SANS BIS (timeout strict 2,5s, circuit breaker après 2 échecs).

# 10. LIENS DE VÉRIFICATION

Le comportement par défaut est : LIEN ROTATIF (et non lien permanent).

Le lien permanent reste fonctionnel (rétrocompatibilité) mais n'est plus le lien PAR DÉFAUT copié/partagé.

Le bouton principal "Copier le lien" doit copier le lien rotatif. Le lien permanent est accessible en secondaire.

Lors de toute évolution liée aux liens, tokens, vérifications :

* préserver la rotation ;
* vérifier l'expiration ;
* vérifier la révocation ;
* vérifier la résistance au replay ;
* éviter les liens statiques inutilement réutilisables.

# 11. CLAIMS MARKETING

Formulations acceptables :

* « réduit le risque »
* « contribue à réduire le risque »
* « renforce la vérification »
* « améliore la capacité de vérification »
* « apporte des éléments de confiance vérifiables »

Formulations interdites :

* « empêche la fraude »
* « supprime la fraude »
* « garantit l'absence de fraude »
* « rend la fraude impossible »
* « infalsifiable » lorsque techniquement ou juridiquement la formulation est excessive

# 12. EXTENSION CHROME

Après CHAQUE modification touchant l'extension Chrome BlockTrust TrustScan :

la recette manuelle documentée dans `TESTING.md` (13 scénarios) doit être exécutée.

Ne jamais considérer une modification extension comme validée uniquement parce que TypeScript compile ou que les tests automatisés passent. L'extension vit dans le DOM Gmail — un environnement propriétaire, changeant, non reproductible en test automatisé.

Règles spécifiques extension :

* Le composeur Gmail (contenteditable) ne doit JAMAIS être scanné par verify-sender
* Les éléments injectés portent l'attribut `data-bt-ui` et doivent être ignorés par le MutationObserver
* Le bouton BIS ne s'affiche QUE si l'email expéditeur a un badge CERTIFIED (vérifié via verify-sender, cache 5min)
* Pour un expéditeur non certifié : "Non certifié BLOCKTRUST" (aucune mention de BIS)
* CTA tooltip : si le viewer a une clé API (= certifié) → "Inviter cet expéditeur" ; sinon → "Certifiez-vous"

# 13. COMPTES INTERNES ET ADMIN

## DASHBOARD_ADMIN_EMAILS

Seuls les emails dans la variable d'environnement `DASHBOARD_ADMIN_EMAILS` ont accès au dashboard admin.

En production, cette variable est **fail-closed** : si elle est absente, AUCUN accès admin n'est autorisé (plus de fallback hardcodé).

## INTERNAL_EMAILS

Les emails dans `INTERNAL_EMAILS` reçoivent un plan Enterprise SANS admin dashboard.

## Super admin

Seul `brnbtech@gmail.com` est super admin. Il est le seul à pouvoir supprimer un autre admin.

Ne jamais hardcoder ces listes dans le code — toujours passer par `lib/admin-utils.ts`.

# 14. GRANDFATHERING

Les comptes créés AVANT le 13 juillet 2026 (`createdAt < 2026-07-13`) ont `emailVerified = NULL` mais ne doivent PAS être bloqués ni suspendus.

La feature de vérification email a été déployée le 7 juillet 2026 mais la table `EmailVerificationToken` n'a été réellement créée en prod que le 17 juillet.

Tout script ou cron qui traite les comptes non vérifiés DOIT exclure les comptes grandfathered ET les comptes internes/admin.

# 15. VAULT (COFFRE-FORT)

Les valeurs sensibles (IBAN, mots de passe, données de référence) sont chiffrées AES-256-GCM dans la colonne `valueEnc`.

Règles :

* Ne JAMAIS stocker une valeur sensible en clair dans la colonne `value`
* Ne JAMAIS retourner la valeur complète dans les réponses API GET (masquage obligatoire : `FR76 •••• XXXX`)
* Révélation complète uniquement via endpoint `/reveal` et uniquement pour OWNER/ADMIN
* Comparaison IBAN : normalisation espaces/casse, mismatch SEULEMENT si AUCUNE entrée ne matche
* AuditLog sur toutes les opérations vault avec hash de la valeur (jamais PII en clair)

# 16. VERCEL CRONS

Liste des crons actifs à ne pas supprimer de `vercel.json` :

* anomaly-detection
* trustscore-updater
* threat-articles
* account-deletion
* email-verification
* subscription-monitor

Chaque cron est protégé par `CRON_SECRET`. Ne jamais les exposer publiquement.

# 17. ARCHITECTURE DE CONFIANCE

BlockTrust est une infrastructure de vérification et non un simple système d'affichage.

Tout mécanisme critique doit être conçu autour de :

* intégrité
* authenticité
* traçabilité
* provenance
* horodatage
* contrôle serveur
* révocation
* résistance au replay
* minimisation de la confiance côté client

Un QR code seul n'est jamais une preuve suffisante.

# 18. POLYGON / ETHERS / ALCHEMY

Toujours distinguer explicitement testnet et mainnet.

Ne jamais :

* déployer automatiquement un smart contract mainnet
* signer une transaction financière réelle
* déplacer des fonds
* exposer une private key
* modifier un wallet opérationnel
* changer une adresse critique sans validation

Privilégier l'ancrage de hash plutôt que le stockage de données personnelles on-chain.

L'ancrage traite 1 certificat max par cycle QStash (~5 min). Import dynamique de ethers (`import('ethers')`) pour éviter les cold starts.

# 19. UPSTASH REDIS

Vérifier :

* TTL et expiration
* Clés correctement namespacées (bt:login:fail, bt:vault, bt:turnstile, te:score)
* Absence de données sensibles
* Cohérence entre cache et source de vérité PostgreSQL
* Comportement en cas d'indisponibilité Redis (fail-closed sur les routes critiques publiques, fail-open acceptable sur les routes authentifiées non critiques)

Redis ne doit jamais devenir la source de vérité d'une donnée métier persistante.

# 20. RESEND

Pour les emails :

* Domaine vérifié : blocktrust.tech (SPF/DKIM/DMARC)
* Emails fire-and-forget pour les notifications (ne pas bloquer le flux principal)
* Tokens de vérification email : hashés en DB, jamais en clair
* Ne jamais considérer un simple succès API Resend comme preuve métier

# 21. CLOUDFLARE TURNSTILE

Toujours vérifier le token côté serveur.

Fail-safe à 5 secondes : si le widget ne répond pas, l'inscription est autorisée avec AuditLog `TURNSTILE_BYPASS` + rate limit 3 comptes/h/IP en filet.

Si > 3 bypasses Turnstile depuis la même IP en 1h → blocage 24h.

# 22. STRIPE

Strictement séparé entre test et production.

Vérifier : signatures webhook, idempotence (ProcessedStripeEvent), statut serveur, synchronisation DB, retries, duplication d'événements.

Ne jamais modifier automatiquement Stripe Live, prix live, abonnements réels, remboursements, produits commerciaux actifs.

Le pricing produit BlockTrust est FIGÉ conformément au chapitre 4.

# 23. SÉCURITÉ

Appliquer systématiquement :

* principe du moindre privilège
* validation côté serveur (jamais confiance client)
* sanitation des inputs (Zod .strict())
* rate limiting (Upstash Redis)
* protection CSRF (Origin/Referer sur mutations)
* protection XSS
* contrôle IDOR (ownership systématique)
* sécurité webhooks (signatures vérifiées)
* audit logs (SecurityAuditLog avec hash, pas PII en clair)
* séparation dev / production

Ne jamais journaliser : mots de passe, private keys, tokens d'authentification, secrets, données sensibles Vault.

# 24. MÉTHODE DE TRAVAIL

## ÉTAPE 1 — INSPECTION

Examine le code existant. Ne suppose pas l'architecture.

## ÉTAPE 2 — IMPACT

Vérifie si la modification touche un invariant BlockTrust.

## ÉTAPE 3 — MODIFICATION

Effectue directement les modifications sûres. Ne donne pas du code à recopier si tu peux intervenir directement.

## ÉTAPE 4 — VALIDATION

Exécute : lint, typecheck, tests, build. Si DB modifiée : sync-db-columns.ts. Si extension modifiée : marquer TESTING.md comme à exécuter.

## ÉTAPE 5 — REVUE

Checklist obligatoire :

[ ] PlanType legacy préservé
[ ] BRONZE/SILVER/GOLD/PLATINUM préservés
[ ] resolveEffectivePlan utilisé si nécessaire
[ ] pricing non modifié
[ ] certification objective, non viewer-dependent
[ ] Root of Trust respecté
[ ] Contact / Trust Circle / Badge non mélangés
[ ] BIS ne bloque pas l'email
[ ] lien rotatif conservé par défaut
[ ] claims marketing non absolus
[ ] sync-db-columns vérifié si DB touchée
[ ] TESTING.md vérifié si extension touchée
[ ] grandfathering respecté si comptes traités
[ ] Vault : valeurs chiffrées, masquage API
[ ] Crons Vercel non supprimés

# 25. ACTIONS SENSIBLES

Demander validation avant toute action destructive, financière, irréversible ou production critique.

Indiquer :

ACTION SENSIBLE — VALIDATION REQUISE

avec : action, raison, impact, rollback prévu.

# 26. GIT

Convention commits :

feat: / fix: / security: / refactor: / perf: / test: / docs: / chore:

Ne jamais committer de secret. Vérifier `git diff` avant push.

# 27. TESTS

Les tests automatisés (331+) prouvent que le code compile, PAS que le produit fonctionne.

Chaque feature livrée doit être testée par un humain en prod.

L'extension Chrome nécessite une recette manuelle (TESTING.md, 13 scénarios) après chaque modification — les tests unitaires ne couvrent PAS le comportement dans le DOM Gmail.

# 28. MODE AUTONOME

Lorsque la demande est claire : inspecte, comprends, modifie, teste, corrige.

Ne t'arrête que devant : ambiguïté produit majeure, risque de destruction, impact financier, modification irréversible, opération production critique.

# 29. FORMAT DU RAPPORT

Après intervention :

## Réalisé
## Fichiers modifiés
## Validation (lint, typecheck, tests, build, sync DB, TESTING.md)
## Invariants vérifiés
## Risques / reste à faire

Ne prétends jamais qu'un test ou un déploiement a été effectué si tu ne l'as pas réellement exécuté.

# 30. PRINCIPE FINAL

Dans BlockTrust :

LA COMPATIBILITÉ AVEC L'HISTORIQUE DU PRODUIT PRIME SUR UNE REFACTORISATION « PLUS PROPRE ».

NE JAMAIS simplifier un mécanisme legacy sans comprendre pourquoi il existe.

Une anomalie apparente peut être une contrainte historique volontaire.

Avant toute suppression ou normalisation, rechercher les dépendances et l'historique du code.
