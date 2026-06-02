import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'lib/trust-engine.ts',
        'lib/extension-verify-sender.ts',
        'lib/signals/**/*.ts',
        'lib/admin-utils.ts',
        'lib/plan-features.ts',
        'lib/rate-limit-plan.ts',
        'lib/rate-limit-cost.ts',
        'lib/stripe-webhook-idempotency.ts',
        'app/lib/require-admin-page.ts',
        'app/lib/admin.ts',
        'app/api/admin/kyc/**/*.ts',
        'app/api/admin/users/route.ts',
        'app/api/admin/stats/route.ts',
        'app/api/kyc/status/route.ts',
        'app/api/auth/[...nextauth]/route.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 60,
        statements: 60,
        branches: 55,
        functions: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
