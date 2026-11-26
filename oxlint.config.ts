import type { OxlintConfig } from 'oxlint'

export default {
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'react', 'jsx-a11y', 'nextjs'],
  categories: {
    correctness: 'error',
  },
  ignorePatterns: ['.next/**', 'node_modules/**', 'src/infrastructure/prisma/contract.d.ts'],
  rules: {
    'typescript/no-explicit-any': 'warn',
    'react/purity': 'off',
    'react/set-state-in-effect': 'off',
    'react/preserve-manual-memoization': 'off',
  },
  overrides: [
    {
      files: ['*.test.{js,ts}', '*.spec.{js,ts}', '**/__tests__/**', '**/test/**', '**/tests/**'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: [
        '*.config.{js,ts,mjs}',
        '*.setup.{js,ts}',
        'vite.config.*',
        'vitest.config.*',
        'playwright.config.*',
      ],
      rules: {
        'no-console': 'off',
      },
    },
  ],
} satisfies OxlintConfig
