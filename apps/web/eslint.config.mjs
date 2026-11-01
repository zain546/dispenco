import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**'],
  },
  {
    files: [
      'src/components/brand/**/*.{ts,tsx}',
      'src/components/marketing/**/*.{ts,tsx}',
      'src/features/auth/components/auth-header.tsx',
      'src/features/auth/components/sign-out-dialog.tsx',
      'src/features/auth/hooks/use-sign-out-confirmation.ts',
      'src/features/auth/components/protected-route.tsx',
      'src/features/auth/hooks/use-login.ts',
      'src/features/auth/hooks/use-signup.ts',
      'src/context/auth-context.tsx',
      'src/lib/auth-policy.ts',
      'src/lib/session-identity.ts',
      'src/lib/server/**/*.ts',
      'src/lib/api.ts',
      'src/proxy.ts',
      'src/app/api/backend/**/*.ts',
      'src/components/ui/alert-dialog.tsx',
      'src/app/(marketing)/**/*.{ts,tsx}',
      'src/app/robots.ts',
      'src/app/sitemap.ts',
    ],
    extends: [...nextVitals, ...nextTypescript],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
]);
