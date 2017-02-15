'use strict';

const _ = require('lodash');
const JsonPointer = require('jsonpointer');
const Schedule = require('node-schedule');
const Bluebird = require('bluebird');

const Transformation = require('./transformation');

class Script {
  /**
   * Initialize script.
   *
   * @param object definition
   *   Script definition.
   * @param Storage storage
   *   Storage.
   */
  constructor(definition, storage) {
    if (typeof definition.name !== 'string') {
      throw new Error('Missing name for script');
    }
    if (!(definition.steps instanceof Array)) {
      throw new Error('Missing steps for script');
    }
    this.definition = _.defaults(definition, {
      maxSteps: 1000,
      delay: 0,
      runOnStartup: false
    });
    this.storage = storage;

    this.running = false;
    this.step = 0;
    this.executedSteps = 0;

    if (typeof definition.schedule === 'string') {
      this.scheduledJob = Schedule.scheduleJob(definition.schedule, () => {
        if (!this.running) {
          this.run({});
        }
      });
      // @todo: Call this.scheduledJob.cancel() when stopping application.
    }

    if (this.definition.runOnStartup) {
      setTimeout(() => {
        this.run();
      }, 2000);
    }
  }

  executeStep() {
    const step = this.definition.steps[this.step];
    if (typeof step === 'undefined') {
      return Promise.resolve();
    }

    if (++this.executedSteps >= this.definition.maxSteps) {
      throw new Error('Maximum executed steps reached');
    }

    let queryPromise = Promise.resolve();
    if (typeof step.query === 'string') {
      let args = {};
      if (typeof step.arguments === 'object') {
        const transformer = new Transformation({object: step.arguments});
        args = transformer.transform(this.data);
      }
      queryPromise = this.storage.query(step.query, args).then(result => {
        const resultProperty = typeof step.resultProperty === 'string' ? step.resultProperty : '/result';
        if (resultProperty === '') {
          this.data = result;
        } else {
          JsonPointer.set(this.data, resultProperty, result);
        }
      }).catch(err => {
        console.error(err);
      });
    }
    return queryPromise.then(() => {
      if (step.transform) {
        const transformer = new Transformation(step.transform);
        this.data = transformer.transform(this.data);
      }

      ++this.step;

      if (step.increment) {
        let value = JsonPointer.get(this.data, step.increment);
        value = typeof value === 'number' ? value + 1 : 0;
        JsonPointer.set(this.data, step.increment, value);
      }

      if (step.jump) {
        const jump = _.defaults(_.clone(step.jump) || {}, {
          left: true,
          right: true,
          operator: '=='
        });
        ['left', 'right'].forEach(operand => {
          if (typeof jump[operand] === 'object' && jump[operand] !== null) {
            const transformer = new Transformation(jump[operand]);
            jump[operand] = transformer.transform(this.data);
          }
        });
        let match;
        switch (jump.operator) {
          case '==':
            match = String(jump.left) === String(jump.right);
            break;
          case '===':
            match = jump.left === jump.right;
            break;
          case '!=':
            match = String(jump.left) !== String(jump.right);
            break;
          case '!==':
            match = jump.left !== jump.right;
            break;
          case '<':
            match = jump.left < jump.right;
            break;
          case '>':
            match = jump.left > jump.right;
            break;
          case '<=':
            match = jump.left <= jump.right;
            break;
          case '>=':
            match = jump.left >= jump.right;
            break;
          case 'in':
            match = jump.right instanceof Array ? jump.right.indexOf(jump.left) >= 0 : false;
            break;
          default:
            match = false;
        }
        if (match) {
          for (let i = 0; i < this.definition.steps.length; ++i) {
            if (this.definition.steps[i].label === jump.to) {
              this.step = i;
            }
          }
        }
      }
      if (this.definition.delay) {
        // Prevent calling Bluebird.delay(0), as it still has a few ms delay.
        return Bluebird.delay(this.definition.delay);
      }
    }).then(() => {
      return this.executeStep();
    });
  }

  run(input) {
    if (this.running) {
      throw new Error('Script is already running');
    }
    this.running = true;
    this.data = input || {};
    this.step = 0;
    return this.executeStep().then(() => {
      this.running = false;
      return this.data;
    }).catch(err => {
      this.running = false;
      throw err;
    });
  }
}

module.exports = Script;