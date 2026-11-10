// @ts-check
import baseConfig from '@volontariapp/eslint-config';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  .../** @type {import('typescript-eslint').ConfigWithExtends[]} */ (
    /** @type {unknown} */ (baseConfig)
  ),
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.ts', '*.js', 'src/tests/unit/*.spec.ts'],
          defaultProject: 'tsconfig.eslint.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  prettierConfig,
  {
    files: ['src/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs'],
  },
);
