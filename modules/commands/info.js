var _ = require('lodash');
var utils = require('../utils');
var filters = require('../filters');

var commands = {};
exports.commands = commands;

commands.info = {
  name: 'info',
  usage: ['overcast info', 'overcast info [name]'],
  description: ['Pretty-prints the complete clusters.json file, stored here:',
    utils.CONFIG_DIR + '/clusters.json',
    'Optionally display only instances matching [name].'],
  required: [{ name: 'name', optional: true, filters: filters.findMatchingInstances }],
  run: function (args) {
    var clusters = utils.getClusters();

    utils.grey('Using ' + utils.CONFIG_DIR + '/clusters.json');

    if (!clusters) {
      console.log('');
      utils.grey('No clusters found.');
      return false;
    }

    if (args.instances) {
      console.log('');
      utils.each(args.instances, instance => {
        console.log(instance.name);
        utils.prettyPrint(instance, 2);
      });

      return false;
    }

    utils.each(clusters, (cluster, clusterName) => {
      console.log('');
      utils.cyan(clusterName);
      utils.each(cluster.instances, instance => {
        console.log('');
        console.log('  ' + instance.name);
        utils.prettyPrint(instance, 4);
      });
    });
  }
};
