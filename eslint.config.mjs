import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'build/**',
      'coverage/**',
      'tests/fixtures/**',
      'build-tests/**',
      'dist-stage/**',
      '_verify/**',
      // This file is generated from the OpenAPI spec and maintained by generator scripts.
      'src/tools.ts',
    ],
  },
  {
    ...eslint.configs.recommended,
    files: ['src/**/*.{ts,js}', 'scripts/**/*.{mjs,cjs}', 'tests/**/*.{ts,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': ['error', {
        allowForKnownSafeCalls: [{ from: 'package', name: 'test', package: 'node:test' }],
      }],
      // Existing Polarion REST and test fixtures intentionally use dynamic payloads.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    files: ['scripts/**/*.{mjs,cjs}', 'tests/**/*.mjs'],
    extends: [tseslint.configs.recommended],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
);
