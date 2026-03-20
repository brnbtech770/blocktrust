# Vérifier que la prod = le dernier commit Git

## Preuve rapide

1. **GitHub** : SHA du dernier commit sur `main` (page du repo ou `git rev-parse origin/main`).
2. **Prod** : ouvrir `https://blocktrust.tech/api/health` et lire `vercelGitCommitSha` (les 7 premiers caractères suffisent pour comparer).

Si les deux diffèrent, **blocktrust.tech n’exécute pas le code que vous croyez** — les correctifs auth / `debug-auth` ne peuvent pas être validés.

## Symptômes typiques

- `authRelease` ou `debugAuthVersion` en prod **en retard** sur le repo.
- Échec OAuth « identique » après des changements pourtant poussés sur `main`.

## Actions dans Vercel

1. **Deployments** : le dernier déploiement **Production** doit afficher le même commit que `origin/main`.
2. Si le déploiement **échoue** (build) : ouvrir les logs, corriger, redeploy.
3. Si **aucun** nouveau déploiement après un `git push` : vérifier que le projet est bien branché sur le bon repo / branche (`main`), et les intégrations GitHub.
4. En cas de doute : **Redeploy** manuel du dernier commit depuis le dashboard, ou **Deploy Hook**.

## Après alignement des SHA

Refaire le flux Google puis ouvrir **`/api/debug-auth` dans le même navigateur** : avec `debugAuthVersion` ≥ 6, le bloc `jwtFromCookie` permet de trancher (cookie illisible vs session vide, etc.).

## www vs apex (cookies OAuth)

Si `NEXTAUTH_URL` est `https://blocktrust.tech` (sans `www`) mais les utilisateurs ouvrent **`https://www.blocktrust.tech`**, les cookies de session sont **host-only** : la session peut « manquer » après Google. Le dépôt inclut un **middleware** qui redirige `www.<NEXTAUTH_URL hostname>` → hostname canonique. Vérifiez aussi dans Vercel que le domaine principal sans `www` est celui utilisé dans `NEXTAUTH_URL`.
