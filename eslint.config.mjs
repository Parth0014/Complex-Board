import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  {
    files: ['src/studio/**/*.tsx', 'src/App.tsx'],
    ignores: ['src/studio/ui/Button.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.name='button'], JSXSelfClosingElement[name.name='button']",
          message: 'Use the shared Button or IconButton primitive.',
        },
        {
          selector:
            "JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name='title'], JSXSelfClosingElement[name.name=/^[a-z]/] > JSXAttribute[name.name='title']",
          message: 'Use data-tip with TooltipProvider instead of a native title tooltip.',
        },
      ],
    },
  },
);
