var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  var clusters = utils.getClusters();

  if (_.isEmpty(clusters)) {
    utils.note('No clusters found.');
    return false;
  }

  utils.grey(utils.CONFIG_DIR + '/clusters.json:');

  _.each(clusters, function (cluster, clusterName) {
    console.log('');
    console.log('  ' + clusterName);
    _.each(cluster.instances, function (instance) {
      console.log('');
      utils.note('    ' + instance.name);
      _.each(instance, function (val, key) {
        if (key !== 'name') {
          utils.grey('      ' + key + ': ' + val);
        }
      });
    });
  });
};

exports.signatures = function () {
  return [
    '  overcast info'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast info',
    '  Pretty-prints the complete clusters.json file, stored here:'.grey,
    ('  ' + utils.CONFIG_DIR + '/clusters.json').cyan
  ]);
};
