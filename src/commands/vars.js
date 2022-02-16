import * as utils from '../utils.js';
import * as log from '../log.js';

export const commands = {};

commands.list = {
  name: 'list',
  usage: ['overcast vars list'],
  description: `List variables in ${utils.getConfigDirs().VARIABLES_JSON}.`,
  run: (args) => {
    const vars = utils.getVariables();
    log.faded(`Using ${utils.getConfigDirs().VARIABLES_JSON}`);
    log.br();
    utils.eachObject(vars, (value, name) => {
      if (value === '') {
        console.log(`${name} = ''`);
      } else if (value === null) {
        console.log(`${name} = null`);
      } else {
        console.log(`${name} = ${value}`);
      }
    });
  }
};

commands.set = {
  name: 'set',
  usage: ['overcast vars set [name] [value]'],
  description: `Set a variable in ${utils.getConfigDirs().VARIABLES_JSON}.`,
  examples: [
    '$ overcast vars set AWS_KEY myawskey12345',
    '$ overcast vars set MY_CUSTOM_VARIABLE_NAME foo'
  ],
  required: ['name', { name: 'value', raw: true }],
  run: function({ name, value }) {
    const vars = utils.getVariables();
    vars[name] = value;
    utils.saveVariables(vars, () => {
      log.success(`Variable "${name}" saved.`);
    });
  }
};

commands.get = {
  name: 'get',
  usage: ['overcast vars get [name]'],
  description: `Get a variable from ${utils.getConfigDirs().VARIABLES_JSON}.`,
  examples: [
    '$ overcast vars get AWS_KEY',
    '> myawskey12345',
    '',
    '$ overcast vars get MY_CUSTOM_VARIABLE_NAME',
    '> foo'
  ],
  required: ['name'],
  run: function({ name }) {
    const vars = utils.getVariables();
    if (vars[name]) {
      console.log(vars[name]);
    } else {
      utils.die(`Variable "${name}" not found.`);
    }
  }
};

commands.delete = {
  name: 'delete',
  usage: ['overcast vars delete [name]'],
  description: `Delete a variable from ${utils.getConfigDirs().VARIABLES_JSON}.`,
  examples: [
    '$ overcast vars delete MY_CUSTOM_VARIABLE_NAME'
  ],
  required: ['name'],
  run: function({ name }) {
    const vars = utils.getVariables();
    if (vars[name]) {
      vars[name] = '';
      utils.saveVariables(vars);
    } else {
      log.alert(`Variable "${name}" not found. No action taken.`);
    }
  }
};
