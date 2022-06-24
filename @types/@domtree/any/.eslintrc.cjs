'use strict';

const path = require('path');

module.exports = {
  root: false,
  parserOptions: {
    project: require.resolve(path.join(__dirname, './tsconfig.json')),
  },
}
