# Guide : Correction du format des clés JWT

## Problème

Si vous avez une erreur "Internal Server Error" sur `/api/auth/session`, c'est probablement dû au format incorrect des clés JWT dans `.env.local`.

## Format correct

Les clés JWT doivent être sur **UNE SEULE LIGNE** avec `\n` (backslash + n) pour les retours à la ligne :

```env
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...\n-----END PRIVATE KEY-----\n"
BLOCKTRUST_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----\n"
```

## Format incorrect ❌

Ne pas utiliser de vrais retours à la ligne :

```env
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----"
```

## Solution 1 : Vérification automatique

Exécutez ce script pour vérifier le format :

```bash
node scripts/check-env-simple.js
```

## Solution 2 : Correction automatique

Si le script détecte un problème, exécutez :

```bash
node scripts/fix-jwt-format.js
```

Ce script va :
1. Détecter les clés avec de vrais retours à la ligne
2. Les reformater avec `\n`
3. Créer une sauvegarde (`.env.local.backup`)
4. Mettre à jour le fichier

## Solution 3 : Correction manuelle

1. Ouvrez `.env.local`
2. Trouvez les lignes `BLOCKTRUST_JWT_PRIVATE_KEY` et `BLOCKTRUST_JWT_PUBLIC_KEY`
3. Si elles sont sur plusieurs lignes, reformatez-les sur une seule ligne avec `\n`

**Exemple de transformation :**

**Avant (incorrect) :**
```env
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----"
```

**Après (correct) :**
```env
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...\n-----END PRIVATE KEY-----\n"
```

## Vérification

Après correction, redémarrez le serveur :

```bash
npm run dev
```

L'erreur "Internal Server Error" devrait disparaître.
