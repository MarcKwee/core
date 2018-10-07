'use strict';

module.exports = {
  mockups: {
    Database: {
      get() {
        return {
          findById() {
            return {};
          },
          update() {}
        };
      }
    }
  },

  tests: [{
    title: 'Update object',
    input: {data: {title: 'Test'}, id: '1', model: 'Item'},
    output: {id: '1', title: 'Test'},
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            title: {type: 'string'}
          }
        },
        id: {type: 'string'},
        model: {type: 'string'}
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: {type: 'string', minLength: 1},
        title: {type: 'string'}
      }
    }
  }]
};