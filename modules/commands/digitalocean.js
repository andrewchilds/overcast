var cp = require('child_process');
var _ = require('lodash');
var utils = require('../utils');
var list = require('./list');
var API = require('../providers/digitalocean.js');

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.argShift(args, 'instance');

  if (!args.subcommand) {
    utils.red('Missing subcommand.');
    return exports.help(args);
  }

  if (/^(droplets|images|regions|sizes|snapshots)$/.test(args.subcommand)) {
    return subcommands[args.subcommand]();
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

  if (instance.digitalocean && instance.digitalocean.id) {
    subcommands[args.subcommand](instance, args);
  } else {
    API.getDropletInfoByInstanceName(instance.name, function (droplet) {
      instance.digitalocean = droplet;
      utils.updateInstance(instance.name, {
        digitalocean: instance.digitalocean
      });
      subcommands[args.subcommand](instance, args);
    });
  }
};

var subcommands = {};

subcommands.droplets = function () {
  API.getDroplets(function (droplets) {
    utils.printCollection('droplets', droplets);
  });
};

subcommands.images = function () {
  API.getImages(function (images) {
    utils.printCollection('images', images);
  });
};

subcommands.regions = function () {
  API.getRegions(function (regions) {
    utils.printCollection('regions', regions);
  });
};

subcommands.sizes = function () {
  API.getSizes(function (sizes) {
    utils.printCollection('sizes', sizes);
  });
};

subcommands.snapshots = function () {
  API.getSnapshots(function (snapshots) {
    utils.printCollection('snapshots', snapshots);
  });
};

subcommands.snapshot = function (instance, args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.red('Missing snapshot name.');
    return exports.help(args);
  }

  API.snapshot(instance, args.name);
};

subcommands.rebuild = function (instance, args) {
  API.rebuild(instance, args);
};

subcommands.reboot = function (instance) {
  API.reboot(instance);
};

subcommands.shutdown = function (instance) {
  API.shutdown(instance);
};

subcommands.destroy = function (instance) {
  API.destroy(instance);
};

exports.signatures = function () {
  return [
    '  overcast digitalocean destroy [instance]',
    '  overcast digitalocean droplets',
    '  overcast digitalocean images',
    '  overcast digitalocean reboot [instance]',
    '  overcast digitalocean rebuild [instance] [options]',
    '  overcast digitalocean regions',
    '  overcast digitalocean sizes',
    '  overcast digitalocean shutdown [instance]',
    '  overcast digitalocean snapshot [instance] [snapshot-name]',
    '  overcast digitalocean snapshots'
  ];
};

exports.help = function () {
  utils.printArray([
    'These functions require the following values set in .overcast/variables.json:',
    '  DIGITALOCEAN_CLIENT_ID',
    '  DIGITALOCEAN_API_KEY',
    '',
    'overcast digitalocean destroy [instance]',
    '  Destroys a DigitalOcean droplet and removes it from your account.'.grey,
    '  This is irreversible.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast digitalocean destroy app.01'.grey,
    '',
    'overcast digitalocean droplets',
    '  List all DigitalOcean droplets in your account.'.grey,
    '',
    'overcast digitalocean images',
    '  List all available DigitalOcean images. Includes snapshots.'.grey,
    '',
    'overcast digitalocean reboot [instance]',
    '  Reboots a DigitalOcean droplet. According to their API docs: "this is the'.grey,
    '  preferred method to use if a server is not responding."'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast digitalocean reboot app.01'.grey,
    '',
    'overcast digitalocean rebuild [instance] [options]',
    '  Rebuild a DigitalOcean droplet using a specified image name, slug or ID.'.grey,
    '  According to the API docs, "This is useful if you want to start again but'.grey,
    '  retain the same IP address for your droplet."'.grey,
    '',
    '    Option              | Default'.grey,
    '    --image-slug=SLUG   | ubuntu-12-04-x64'.grey,
    '    --image-name=NAME   |'.grey,
    '    --image-id=ID       |'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast digitalocean rebuild app.01 --name=my.app.snapshot'.grey,
    '',
    'overcast digitalocean regions',
    '  List available DigitalOcean regions (nyc2, sfo1, etc).'.grey,
    '',
    'overcast digitalocean sizes',
    '  List available DigitalOcean sizes (512mb, 1gb, etc).'.grey,
    '',
    'overcast digitalocean shutdown [instance]',
    '  Shut down a DigitalOcean droplet.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast digitalocean shutdown app.01'.grey,
    '',
    'overcast digitalocean snapshot [instance] [snapshot-name]',
    '  Creates a named snapshot of a droplet. This process will reboot the instance.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast digitalocean snapshot app.01'.grey,
    '',
    'overcast digitalocean snapshots',
    '  Lists available snapshots in your DigitalOcean account.'.grey
  ]);
};
