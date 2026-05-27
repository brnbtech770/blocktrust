// tests/setup.ts — env minimal pour tests isolés (sans DB réelle)
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
process.env.ADMIN_EMAILS = 'admin@blocktrust.tech'
process.env.BLOCKTRUST_JWT_PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEplaceholder\n-----END PUBLIC KEY-----'
