import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**'],
  },
  {
    files: [
      'src/components/marketing/**/*.{ts,tsx}',
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
