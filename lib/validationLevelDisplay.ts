// lib/validationLevelDisplay.ts
// Réexporte les helpers UI niveau certificat (lib/certificate-plan-level.ts).
// ============================================================

export {
  getCertificateLevelDisplayLabel,
  getValidationLevelAccentClass,
  getValidationLevelLabel,
  getValidationLevelBadgeClass,
  deriveCertificateLevelFromPlan,
  deriveCertificateLevelForUser,
} from '@/lib/certificate-plan-level'
