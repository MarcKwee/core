'use strict';

module.exports = {
  title: 'Pick',
  description: 'Process output from left operand with expression in right operand',
  isBinary: true,
  cache: 0,
  lazy: true,

  inputSchema: {},

  binary: async (left, right) => {
    return right(await left());
  }
};
