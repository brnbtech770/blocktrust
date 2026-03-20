/**
 * Auth.js v5 lit souvent AUTH_SECRET et AUTH_URL depuis process.env. Sur Vercel, beaucoup
 * de projets n’ont que NEXTAUTH_* → callbacks / JWT incohérents (symptôme : pas de session après OAuth).
 */
export const authEnvShim = {
  secretMirrored: false as boolean,
  authUrlMirrored: false as boolean,
  trustHostMirrored: false as boolean,
}

if (typeof process !== 'undefined') {
  if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET
    authEnvShim.secretMirrored = true
  }
  if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
    process.env.AUTH_URL = process.env.NEXTAUTH_URL
    authEnvShim.authUrlMirrored = true
  }
  // Aligné sur trustHost: true dans la config ; certaines lectures internes utilisent la variable.
  if (!process.env.AUTH_TRUST_HOST) {
    process.env.AUTH_TRUST_HOST = 'true'
    authEnvShim.trustHostMirrored = true
  }
}
