'use strict';

const {Op} = require('sequelize');

module.exports = {
  title: 'Update',
  description: 'Update object in the database',

  inputSchema: {
    type: 'object',
    properties: {
      id: {
        title: 'Object id',
        type: 'string'
      },
      data: {
        title: 'Data',
        type: 'object'
      },
      model: {
        title: 'Model name',
        type: 'string'
      }
    },
    required: ['id', 'data', 'model'],
    additionalProperties: false
  },

  requires: ['Database'],

  unary: async ({id, data, model}, {Database}) => {
    const db = Database.get(model);
    const item = await db.findById(id);
    if (item === null) {
      throw new Error(`${model} does not exist`);
    }
    const inputData = Object.keys(data).reduce((prev, curr) => ({
      ...prev,
      [curr]: typeof data[curr] === 'object' && data[curr] !== null ? JSON.stringify(data[curr]) : data[curr]
    }), {});
    await db.update(inputData, {
      where: {
        id: {
          [Op.eq]: id
        }
      }
    });
    return {...data, id};
  }
};
