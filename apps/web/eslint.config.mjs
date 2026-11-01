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
