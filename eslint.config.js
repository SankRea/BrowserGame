import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.npm-cache/**', 'public/**'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-duplicate-imports': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'always'],
    },
  },
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['*.config.js'], languageOptions: { globals: globals.node } },
];
