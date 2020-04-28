'use strict';

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2019,
  },
  env: {
    node: true,
    es6: true,
    mocha: true,
    jquery: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {
    strict: ['error', 'global'],
  },
  plugins: ['html'],
};
