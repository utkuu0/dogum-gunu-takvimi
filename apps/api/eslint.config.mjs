// @ts-check
import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from '../../eslint.base.mjs';

export default tseslint.config(
  { ignores: ['eslint.config.mjs', 'dist/**'] },
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  }
);
