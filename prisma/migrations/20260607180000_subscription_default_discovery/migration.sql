-- SYS-9 : aligne le défaut de Subscription.plan sur le plan gratuit Découverte.
-- Additif et NON destructif : modifie uniquement la valeur par défaut de la colonne.
-- Les lignes existantes ne sont PAS modifiées (la résolution du plan effectif
-- tient désormais compte du statut Stripe — un plan résiduel sans abonnement
-- actif ne donne aucun droit payant).
-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'DISCOVERY';
