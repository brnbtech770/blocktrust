/**
 * Auth.js v5 lit souvent AUTH_SECRET depuis process.env. Sur Vercel, beaucoup de projets
 * n’ont que NEXTAUTH_SECRET → jeton signé avec le secret de config mais échec de décodage
 * si une couche interne exige AUTH_SECRET (symptôme : pas de session après OAuth).
 */
export const authEnvShim = { mirrored: false as boolean }

if (
  typeof process !== 'undefined' &&
  process.env.NEXTAUTH_SECRET &&
  !process.env.AUTH_SECRET
) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET
  authEnvShim.mirrored = true
}
