var utils = require('./utils');

exports.findMatchingInstances = function (name, args) {
  args.instances = utils.findMatchingInstancesByInstanceName(name);

  if (args.instances.length === 0) {
    utils.dieWithList('No instances found matching "' + name + '".');
    return false;
  }
};

exports.findMatchingCluster = function (name, args) {
  var clusters = utils.getClusters();
  args.cluster = clusters[name];

  if (!args.cluster) {
    utils.dieWithList('No clusters found matching "' + name + '".');
    return false;
  }
};

exports.shouldBeNewCluster = function (name, args) {
  var clusters = utils.getClusters();

  if (clusters[name]) {
    utils.grey('The cluster "' + name + '" already exists, no action taken.');
    return false;
  }
};
