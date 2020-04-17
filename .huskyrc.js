'use strict';

module.exports = {
  hooks: {
    'pre-commit': 'lint-staged && yarn test',
    'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
  },
};
