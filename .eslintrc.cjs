module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
        js: 'never',
      },
    ],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'no-plusplus': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
}; 