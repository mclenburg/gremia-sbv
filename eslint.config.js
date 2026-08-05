import tseslintParser from '@typescript-eslint/parser';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

const generatedAndExternalFiles = [
  'node_modules/**',
  'dist/**',
  'dist-electron/**',
  'release/**',
  'coverage/**',
  'test-results/**',
  'playwright-report/**',
  'THIRD_PARTY_LICENSES.txt',
  'THIRD_PARTY_NOTICES.txt',
];

export default [
  {
    name: 'gremia/ignores',
    ignores: generatedAndExternalFiles,
  },
  {
    name: 'gremia/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      'no-debugger': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Der historische Bestand wird durch das AST-Ratchet in
      // maintenance/type-safety/explicit-any-baseline.json exakt eingefroren.
      // Nach vollständigem Abbau wird diese ESLint-Regel auf error gestellt.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    name: 'gremia/playwright-fixture-callback',
    files: ['e2e/support/test.ts'],
    rules: {
      // Playwright nennt den Fixture-Consumer bewusst `use`. Das ist kein
      // React Hook, wird von react-hooks/rules-of-hooks aber namensbasiert
      // als solcher interpretiert. Die Ausnahme bleibt auf diese eine
      // Playwright-Adapterdatei begrenzt.
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    name: 'gremia/javascript-tooling',
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      'no-debugger': 'error',
    },
  },
];
