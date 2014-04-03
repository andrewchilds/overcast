var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');
var list = require('./list');

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.argShift(args, 'name');

  if (args.subcommand && commands[args.subcommand]) {
    commands[args.subcommand](args);
  } else {
    utils.red('Missing or unknown subcommand.');
    exports.help(args);
  }
};

var commands = {};

commands.list = function (args) {
  list.run(args);
};

commands.create = function (args) {
  var clusters = utils.getClusters();

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (clusters[args.name]) {
    utils.die('The cluster "' + args.name + '" already exists.');
  }

  clusters[args.name] = { instances: {} };

  utils.saveClusters(clusters, function () {
    utils.success('Cluster "' + args.name + '" has been created.');
    list.run(args);
  });
};

commands.rename = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'newName');

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (!args.newName) {
    utils.red('Missing [new-name] parameter.');
    return exports.help(args);
  } else if (!clusters[args.name]) {
    utils.die('The cluster "' + args.name + '" wasn\'t found.');
  }

  clusters[args.newName] = clusters[args.name];
  delete clusters[args.name];

  utils.saveClusters(clusters, function () {
    utils.success('Cluster "' + args.name + '" has been renamed to "' + args.newName + '".');
    list.run(args);
  });
};

commands.remove = function (args) {
  var clusters = utils.getClusters();

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (!clusters[args.name]) {
    utils.die('The cluster "' + args.name + '" wasn\'t found.');
  }

  var orphaned = false;
  if (!_.isEmpty(clusters[args.name].instances)) {
    orphaned = true;
    clusters.orphaned = clusters.orphaned || { instances: {} };
    _.extend(clusters.orphaned.instances, clusters[args.name].instances);
  }

  delete clusters[args.name];

  utils.saveClusters(clusters, function () {
    utils.success('Cluster "' + args.name + '" has been removed.');
    if (orphaned) {
      utils.alert('All instances from this cluster were moved to the "orphaned" cluster.');
    }
    list.run(args);
  });
};

exports.signatures = function () {
  return [
    '  overcast cluster list',
    '  overcast cluster create [name]',
    '  overcast cluster rename [name] [new-name]',
    '  overcast cluster remove [name]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast cluster create [name]',
    '  Creates a new cluster.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast cluster create db'.grey,
    '',
    'overcast cluster rename [name] [new-name]',
    '  Renames a cluster.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast cluster rename app-cluster app-cluster-old'.grey,
    '',
    'overcast cluster remove [name]',
    '  Removes a cluster from the index. If the cluster has any instances'.grey,
    '  attached to it, they will be moved to the "orphaned" cluster.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast cluster remove db'.grey
  ]);
};
