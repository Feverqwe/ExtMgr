import gravityConfig from '@gravity-ui/eslint-config';
import a11yConfig from '@gravity-ui/eslint-config/a11y';
import clientConfig from '@gravity-ui/eslint-config/client';
import prettierConfig from '@gravity-ui/eslint-config/prettier';

export default [
  ...gravityConfig,
  ...clientConfig,
  ...a11yConfig,
  ...prettierConfig,
  {
    rules: {
      complexity: 'off',
      'consistent-return': 'off',
      curly: 'off',
      'handle-callback-err': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'no-console': 'off',
      'no-implicit-coercion': 'off',
      'no-nested-ternary': 'off',
      'no-param-reassign': 'off',
      'no-shadow': 'off',
      'no-use-before-define': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/parameter-properties': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      'react/sort-comp': 'off',
    },
  },
];
