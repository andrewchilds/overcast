var _ = require('lodash');
var colors = require('colors');
var utils = require('../utils');

var commands = {};
exports.commands = commands;

commands.list = {
  usage: 'overcast var list',
  description: 'List variables in ' + utils.VARIABLES_JSON + '.',
  run: function (args) {
    var vars = utils.getVariables();
    utils.grey('Using ' + utils.VARIABLES_JSON);
    console.log('');
    _.each(vars, function (value, name) {
      if (value === '') {
        console.log(name + ' ' + ('empty string').red);
      } else if (_.isNull(value)) {
        console.log(name + ' ' + ('null').red);
      } else {
        console.log(name + ' ' + value.green);
      }
    });
  }
};

commands.set = {
  usage: 'overcast var set [name] [value]',
  description: 'Set a variable in ' + utils.VARIABLES_JSON + '.',
  examples: [
    '$ overcast var set AWS_KEY myawskey12345',
    '$ overcast var set MY_CUSTOM_VARIABLE_NAME foo'
  ],
  required: ['name', 'value'],
  run: function (args) {
    var vars = utils.getVariables();
    vars[args.name] = args.value;
    utils.saveVariables(vars);
    utils.success('OK.');
  }
};

commands.get = {
  usage: 'overcast var get [name]',
  description: 'Get a variable from ' + utils.VARIABLES_JSON + '.',
  examples: [
    '$ overcast var get AWS_KEY',
    '> myawskey12345',
    '',
    '$ overcast var get MY_CUSTOM_VARIABLE_NAME',
    '> foo'
  ],
  required: ['name'],
  run: function (args) {
    var vars = utils.getVariables();
    if (vars[args.name]) {
      console.log(vars[args.name]);
    } else {
      utils.die('Variable not found!');
    }
  }
};

commands.delete = {
  usage: 'overcast var delete [name]',
  description: 'Delete a variable from ' + utils.VARIABLES_JSON + '.',
  examples: [
    '$ overcast var delete MY_CUSTOM_VARIABLE_NAME'
  ],
  required: ['name'],
  run: function (args) {
    var vars = utils.getVariables();
    if (vars[args.name]) {
      vars[args.name] = '';
      utils.saveVariables(vars);
      utils.success('OK.');
    } else {
      utils.grey('Variable not found, no action taken.');
    }
  }
};
