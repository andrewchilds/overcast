var _ = require('lodash');
var readline = require('readline');
var utils = require('../utils');
var list = require('./list');
var API = require('../providers/linode.js');
var instanceCommand = require('./instance.js');

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.argShift(args, 'instance');

  if (!args.subcommand) {
    utils.red('Missing subcommand.');
    return exports.help(args);
  }

  if (/^(create|datacenters|distributions|kernels|linodes|plans)$/.test(args.subcommand)) {
    return subcommands[args.subcommand](args);
  }

  if (!args.instance) {
    utils.red('Missing [instance] parameter.');
    return exports.help(args);
  }
  if (!subcommands[args.subcommand]) {
    utils.red('Unknown subcommand.');
    return exports.help(args);
  }

  var instance = utils.findOnlyMatchingInstance(args.instance);
  if (!instance) {
    utils.red('No instance found matching "' + args.instance + '".');
    return list.run(args);
  }

  if (instance.linode && instance.linode.id) {
    subcommands[args.subcommand](instance, args);
  } else {
    API.getLinodes({ 'linode-name': instance.name }).then(function (linodes) {
      instance.linode = linodes[0];
      utils.updateInstance(instance.name, { linode: instance.linode });
      subcommands[args.subcommand](instance, args);
    }).catch(API.errorCatcher);
  }
};

var subcommands = {};

subcommands.boot = function (instance) {
  API.bootLinode({ 'linode-name': instance.name });
};

subcommands.create = function (args) {
  var clusters = utils.getClusters();

  if (!args.cluster) {
    utils.red('Missing --cluster parameter.');
    return exports.help(args);
  } else if (!clusters[args.cluster]) {
    utils.die('No "' + args.cluster + '" cluster found. Known clusters are: ' +
      _.keys(clusters).join(', ') + '.');
  } else if (clusters[args.cluster].instances[args.name]) {
    utils.red('Instance "' + args.name + '" already exists.');
    return list.run(args);
  }

  args.name = args.instance;
  API.create(args).then(function (res) {
    var instance = {
      ip: res.linode.ip,
      name: args.name,
      ssh_key: args['ssh-key'] || utils.CONFIG_DIR + '/keys/overcast.key',
      ssh_port: 22,
      user: 'root',
      linode: res.linode
    };

    var clusters = utils.getClusters();
    clusters[args.cluster] = clusters[args.cluster] || { instances: {} };
    clusters[args.cluster].instances[args.name] = instance;
    utils.saveClusters(clusters);
    utils.success('Instance "' + args.name + '" (' + instance.ip + ') saved.');
  });
};

subcommands.datacenters = function () {
  API.getDatacenters().then(function (datacenters) {
    utils.printCollection('datacenters', datacenters);
  });
};

subcommands.destroy = function (instance, args) {
  function destroy() {
    API.shutdownLinode({ 'linode-name': instance.name })
      .then(API.deleteDisks)
      .then(API.deleteLinode)
      .catch(API.errorCatcher).then(function () {
        utils.success('Linode "' + instance.name + '" deleted.');
        instanceCommand.run({ '_': [ 'remove', instance.name ] });
      });
  }

  if (args.force) {
    return destroy();
  }

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Do you really want to destroy this linode? [Y/n]'.yellow, function (answer) {
    rl.close();
    if (answer === 'n' || answer === 'N') {
      utils.grey('No action taken.');
    } else {
      destroy();
    }
  });
};

subcommands.distributions = function () {
  API.getDistributions().then(function (distributions) {
    utils.printCollection('distributions', distributions);
  });
};

subcommands.kernels = function () {
  API.getKernels().then(function (kernels) {
    utils.printCollection('kernels', kernels);
  });
};

subcommands.linodes = function () {
  API.getLinodes().then(function (linodes) {
    utils.printCollection('linodes', linodes);
  });
};

subcommands.plans = function () {
  API.getPlans().then(function (plans) {
    utils.printCollection('plans', plans);
  });
};

subcommands.reboot = function (instance) {
  API.rebootLinode({ 'linode-name': instance.name })
  .then(API.waitForPendingJobs)
  .then(function () {
    utils.success('Rebooted.');
  });
};

subcommands.resize = function (instance, args) {
  var data = { 'linode-name': instance.name };
  if (args['plan-id']) {
    data['plan-id'] = args['plan-id'];
  } else if (args['plan-slug']) {
    data['plan-slug'] = args['plan-slug'];
  }
  API.resizeLinode(data).then(function () {
    utils.success('Linode resized.');
  });
};

subcommands.shutdown = function (instance) {
  API.shutdownLinode({ 'linode-name': instance.name });
};

exports.signatures = function () {
  return [
    '  overcast linode boot [instance]',
    '  overcast linode create [instance] [options]',
    '  overcast linode datacenters',
    '  overcast linode destroy [instance]',
    '  overcast linode distributions',
    '  overcast linode kernels',
    '  overcast linode linodes',
    '  overcast linode plans',
    '  overcast linode reboot [instance]',
    '  overcast linode shutdown [instance]'
  ];
};

exports.help = function () {
  utils.printArray([
    'These functions require LINODE_API_KEY property to be set in .overcast/variables.json.',
    'API keys can be found at https://manager.linode.com/profile/api',
    '',
    'overcast linode boot [instance]',
    '  Boot a powered off linode.'.grey,
    '',
    'overcast linode create [name] [options]',
    '  Creates a new Linode.'.grey,
    '',
    '    Option                    | Default'.grey,
    '    --cluster CLUSTER         |'.grey,
    '    --datacenter-slug NAME    | newark'.grey,
    '    --datacenter-id ID        |'.grey,
    '    --distribution-slug NAME  | ubuntu-12-04-lts'.grey,
    '    --distribution-id ID      |'.grey,
    '    --kernel-id ID            |'.grey,
    '    --kernel-name NAME        | Latest 64 bit'.grey,
    '    --payment-term ID         | 1 (monthly, if not metered)'.grey,
    '    --plan-id ID              |'.grey,
    '    --plan-slug NAME          | 2048'.grey,
    '    --password PASSWORD       | autogenerated'.grey,
    ('    --ssh-key KEY_PATH        | ' + utils.CONFIG_DIR + '/keys/overcast.key').grey,
    ('    --ssh-pub-key KEY_PATH    | ' + utils.CONFIG_DIR + '/keys/overcast.key.pub').grey,
    '',
    '  Example:'.grey,
    '  $ overcast linode create db.01 --cluster db --datacenter-slug london'.grey,
    '',
    'overcast linode datacenters',
    '  List available Linode datacenters.'.grey,
    '',
    'overcast linode destroy [instance]',
    '  Destroys a linode and removes it from your account.'.grey,
    '  Using --force overrides the confirm dialog. This is irreversible.'.grey,
    '',
    '    Option                    | Default'.grey,
    '    --force                   | false'.grey,
    '',
    'overcast linode distributions',
    '  List available Linode distributions.'.grey,
    '',
    'overcast linode kernels',
    '  List available Linode kernels.'.grey,
    '',
    'overcast linode linodes',
    '  List all linodes in your account.'.grey,
    '',
    'overcast linode plans',
    '  List available Linode plans.'.grey,
    '',
    'overcast linode resize [instance] [options]',
    '  Resizes a linode to the specified plan. This will immediately shutdown and migrate your linode.'.grey,
    '',
    '    Option                    | Default'.grey,
    '    --plan-id ID              |'.grey,
    '    --plan-slug NAME          |'.grey,
    '',
    'overcast linode reboot [instance]',
    '  Reboots a linode.'.grey,
    '',
    'overcast linode shutdown [instance]',
    '  Shut down a linode.'.grey
  ]);
};
