var _ = require('lodash');
var utils = require('../utils');
var phantom_utils = require('../phantom-utils');
var instance = require('./instance');
var filters = require('../filters');

var commands = {};
exports.commands = commands;

commands.godaddy = {
  name: 'godaddy',
  usage: 'overcast godaddy [instance|cluster|all] [recordname] [options...]',
  description: [
    'Create new records @Godaddy',
    'Expects a record name, for example overcast.google.com'
  ],
  examples: [
    '$ overcast godaddy app "overcast.google.com"'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name', filters: filters.findMatchingInstances },
    { name: 'recordname', varName: 'rname' }
  ],
  options: [],
  run: function (args) {
    var opts = {};
    var record_name = args.rname.split(".");
    var variables = utils.getVariables();

    if (record_name.length <= 2) {
      utils.red('Invalid record name!');
      return utils.die('Please configure valid record!');
    } else {
      record_name.shift();
      opts.domain = record_name.join(".");
      opts.domain_name = args.rname;
    }

    if (!variables.GODADDY_USERNAME || !variables.GODADDY_PASSWORD) {
      utils.red('Missing GODADDY_USERNAME and GODADDY_PASSWORD');
      return utils.die('Please add to ' + utils.VARIABLES_JSON);
    }

    _.each(args.instances, function (instance) {
      opts.ip_address = instance.ip;
    });

    phantom_utils.initialize(opts);
  }
};
