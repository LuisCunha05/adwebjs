import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@ui': path.resolve(import.meta.dirname, './src/components/ui'),
      '@compound': path.resolve(import.meta.dirname, './src/components/compound'),
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    env: {
      LDAP_URL: 'ldaps://ldap.example.test',
      LDAP_BASE_DN: 'DC=example,DC=test',
      LDAP_ADMIN_DN: 'admin@example.test',
      LDAP_ADMIN_PASSWORD: 'test-admin-password',
      SESSION_SECRET: 'test-session-secret-that-is-at-least-32-characters-long',
      SESSION_COOKIE_NAME: 'adweb_session',
      SESSION_EXPIRATION_SECONDS: '3600',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_password',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'test_db',
    },
  },
})
