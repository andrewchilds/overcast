import utils from '../utils';
import cli from '../cli';

export function run(args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[instance]', exports.help);
  }

  const instance = utils.findFirstMatchingInstance(args.name);
  utils.handleInstanceNotFound(instance, args);

  let command;
  if (instance.digitalocean) {
    command = require('./digitalocean.js');
    args.command = 'digitalocean';
    args.subcommand = 'destroy';
    args._.unshift(args.name);
    delete args.name;
    return cli.run(command.commands.destroy, args);
  } else if (instance.aws) {
    command = require('./aws.js');
    args.command = 'aws';
    args.subcommand = 'destroy';
    args._.unshift(args.name);
    delete args.name;
    return cli.run(command.commands.destroy, args);
  } else if (instance.virtualbox) {
    command = require('./virtualbox.js');
    args.command = 'virtualbox';
    args.subcommand = 'destroy';
    args._.unshift(args.name);
    delete args.name;
    return cli.run(command.commands.destroy, args);
  } else if (instance.linode) {
    command = require('./linode.js');
    args.command = 'linode';
    args.subcommand = 'destroy';
    args._.unshift(args.name);
    delete args.name;
    return cli.run(command.commands.destroy, args);
  } else {
    return utils.die('This instance doesn\'t belong to a recognized provider.');
  }
}

export function signatures() {
  return [
    '  overcast destroy [name]'
  ];
}

export function help() {
  utils.printArray([
    'overcast destroy [instance]',
    '  Destroy an instance using the provider API.'.grey,
    '',
    '    Option      | Default'.grey,
    '    --force     | false'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast destroy app-01'.grey
  ]);
}
