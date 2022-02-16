import * as utils from '../utils.js';
import * as log from '../log.js';
import { getVariablesJSON } from '../store.js';

export const commands = {};

commands.list = {
  name: 'list',
  usage: ['overcast vars list'],
  description: `List variables in ${getVariablesJSON()}.`,
  run: (args, nextFn) => {
    const vars = utils.getVariables();
    log.faded(`Using ${getVariablesJSON()}`);
    log.br();
    utils.eachObject(vars, (value, name) => {
      if (value === '') {
        log.log(`${name} = ''`);
      } else if (value === null) {
        log.log(`${name} = null`);
      } else {
        log.log(`${name} = ${value}`);
      }
    });

    nextFn();
  }
};

commands.set = {
  name: 'set',
  usage: ['overcast vars set [name] [value]'],
  description: `Set a variable in ${getVariablesJSON()}.`,
  examples: [
    '$ overcast vars set AWS_KEY myawskey12345',
    '$ overcast vars set MY_CUSTOM_VARIABLE_NAME foo'
  ],
  required: ['name', { name: 'value', raw: true }],
  run: ({ name, value }, nextFn) => {
    const vars = utils.getVariables();
    vars[name] = value;
    utils.saveVariables(vars, () => {
      log.success(`Variable "${name}" saved.`);
      nextFn();
    });
  }
};

commands.get = {
  name: 'get',
  usage: ['overcast vars get [name]'],
  description: `Get a variable from ${getVariablesJSON()}.`,
  examples: [
    '$ overcast vars get AWS_KEY',
    '> myawskey12345',
    '',
    '$ overcast vars get MY_CUSTOM_VARIABLE_NAME',
    '> foo'
  ],
  required: ['name'],
  run: ({ name }, nextFn) => {
    const vars = utils.getVariables();
    if (vars[name]) {
      log.log(vars[name]);
    } else {
      utils.die(`Variable "${name}" not found.`);
    }

    nextFn();
  }
};

commands.delete = {
  name: 'delete',
  usage: ['overcast vars delete [name]'],
  description: `Delete a variable from ${getVariablesJSON()}.`,
  examples: [
    '$ overcast vars delete MY_CUSTOM_VARIABLE_NAME'
  ],
  required: ['name'],
  run: ({ name }, nextFn) => {
    const vars = utils.getVariables();
    if (vars[name]) {
      vars[name] = '';
      utils.saveVariables(vars, nextFn);
    } else {
      log.alert(`Variable "${name}" not found. No action taken.`);
      nextFn();
    }
  }
};
