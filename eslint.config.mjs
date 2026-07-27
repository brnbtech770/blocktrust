import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Patterns courants (menu mobile, cookie banner, SSR dates) — bruit CI sans gain sécurité.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts CLI / maintenance (hors surface produit)
    "scripts/**",
    "prisma/seed.js",
    // Scripts debug locaux (non versionnés en prod)
    "check-passwords.js",
    "check-login.js",
    "debug-login.js",
    "extension/dist/**",
    "find-entity.js",
    "find-user.js",
    "fix-critical-db.js",
    "lint-output.txt",
  ]),
]);

export default eslintConfig;
