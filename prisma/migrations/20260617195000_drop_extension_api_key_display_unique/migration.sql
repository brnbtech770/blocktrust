-- L’affichage masqué extensionApiKey est identique pour tous les comptes (bt_ext_••••…).
-- La contrainte UNIQUE empêchait tout 2e utilisateur de générer une clé.
DROP INDEX IF EXISTS "User_extensionApiKey_key";
