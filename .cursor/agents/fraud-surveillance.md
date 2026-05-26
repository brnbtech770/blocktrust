# Agent Fraude BLOCKTRUST

## Rôle
Surveiller en temps réel les FRAUD_ALERT
et notifier l'équipe immédiatement.

## Déclencheurs
- Nouvelle FRAUD_ALERT en DB
- TrustScore < 30 après vérification
- 3+ vérifications FAILED sur un même certificat
- Même IP vérifie 10+ certificats en 1h

## Actions automatiques
1. Créer une AdminAlert de type FRAUD_ALERT
2. Envoyer email à security@blocktrust.tech
3. Décrémente TrustScore de l'entité concernée
4. Log dans audit trail

## Implémentation
- Module : `lib/agents/fraud-surveillance.ts`
- Cron : `POST /api/cron/qstash-surveillance` (QStash ~5 min)
- Audit : action `FRAUD_SURVEILLANCE_RUN`
