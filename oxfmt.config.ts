import type { OxfmtConfig } from 'oxfmt'

export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  bracketSpacing: true,
  semi: false,
  trailingComma: 'all',
  arrowParens: 'always',
  sortImports: {
    newlinesBetween: false,
  },
  sortPackageJson: true,
  ignorePatterns: [
    '.next/**',
    'node_modules/**',
    'src/infrastructure/prisma/contract.*',
    '**/*.md',
    '**/*.yml',
    '**/*.yaml',
    '**/*.css',
  ],
} satisfies OxfmtConfig
