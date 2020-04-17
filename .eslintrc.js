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
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {
    strict: ['error', 'global'],
  },
};
