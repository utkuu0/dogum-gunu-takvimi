// Kökten paylaşılan taban ESLint kuralları. apps/* ve packages/* kendi
// eslint.config.mjs'inde bunu import edip framework'e özel config ekliyor.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/**', 'build/**', '.expo/**', 'node_modules/**'],
  }
);
