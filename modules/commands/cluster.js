var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');
var listCommand = require('./list');

exports.signatures = function () {
  return utils.printSignatures(subcommands);
};

exports.help = function () {
  utils.printCommandHelp(subcommands);
};

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.runSubcommand(args, subcommands, exports.help);
};

var subcommands = {};

subcommands.list = utils.module(function (exports) {
  exports.signature = 'overcast cluster list';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Alias for overcast list.'.grey
    ]);
  };

  exports.run = listCommand.run;
});

subcommands.count = utils.module(function (exports) {
  exports.signature = 'overcast cluster count [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Return the number of instances in a cluster.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast cluster count db'.grey,
      '  > 0'.grey,
      '  $ overcast instance create db.01 --cluster db'.grey,
      '  > ...'.grey,
      '  $ overcast cluster count db'.grey,
      '  > 1'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!clusters[args.name]) {
      return utils.die('The cluster "' + args.name + '" wasn\'t found.');
    }

    console.log(_.keys(clusters[args.name].instances).length);
  };
});

subcommands.create = utils.module(function (exports) {
  exports.signature = 'overcast cluster create [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Creates a new cluster.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast cluster create db'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (clusters[args.name]) {
      return utils.grey('The cluster "' + args.name + '" already exists, no action taken.');
    }

    clusters[args.name] = { instances: {} };

    utils.saveClusters(clusters, function () {
      utils.success('Cluster "' + args.name + '" has been created.');
      listCommand.run(args);
    });
  };
});

subcommands.rename = utils.module(function (exports) {
  exports.signature = 'overcast cluster rename [name] [new-name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Renames a cluster.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast cluster rename app-cluster app-cluster-renamed'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');
    utils.argShift(args, 'newName');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!args.newName) {
      return utils.missingParameter('[new-name]', exports.help);
    } else if (!clusters[args.name]) {
      return utils.die('The cluster "' + args.name + '" wasn\'t found.');
    } else if (clusters[args.newName]) {
      return utils.die('The cluster "' + args.newName + '" already exists!');
    }

    clusters[args.newName] = clusters[args.name];
    delete clusters[args.name];

    utils.saveClusters(clusters, function () {
      utils.success('Cluster "' + args.name + '" has been renamed to "' + args.newName + '".');
      listCommand.run(args);
    });
  };
});

subcommands.remove = utils.module(function (exports) {
  exports.signature = 'overcast cluster remove [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Removes a cluster from the index. If the cluster has any instances'.grey,
      '  attached to it, they will be moved to the "orphaned" cluster.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast cluster remove db'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!clusters[args.name]) {
      return utils.die('The cluster "' + args.name + '" wasn\'t found.');
    }

    var orphaned = 0;
    if (!_.isEmpty(clusters[args.name].instances)) {
      orphaned = _.keys(clusters[args.name].instances).length;
      clusters.orphaned = clusters.orphaned || { instances: {} };
      _.extend(clusters.orphaned.instances, clusters[args.name].instances);
    }

    delete clusters[args.name];

    utils.saveClusters(clusters, function () {
      utils.success('Cluster "' + args.name + '" has been removed.');
      if (orphaned) {
        if (args.name === 'orphaned') {
          utils.alert('The ' + orphaned + ' instance(s) in the "orphaned" cluster were removed.');
        } else {
          utils.alert('The ' + orphaned + ' instance(s) from this cluster were moved to the "orphaned" cluster.');
        }
      }
      listCommand.run(args);
    });
  };
});
