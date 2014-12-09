var path = require('path');
var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

var commands = {};
exports.commands = commands;

commands.run = {
  name: 'run',
  usage: 'overcast run [instance|cluster|all] [command|file...]',
  description: [
    'Execute commands or script files on an instance or cluster over SSH.',
    'Commands will execute sequentially unless the --parallel flag is used.',
    'An error will stop execution unless the --continueOnError flag is used.',
    'Script files can be either absolute or relative path.',
  ],
  examples: [
    '# Run arbirary commands and files in sequence across all instances:',
    '$ overcast run all uptime "free -m" "df -h" /path/to/my/script',
    '',
    '# Setting environment variables:',
    '$ overcast run app --env "foo=\'bar bar\' testing=123" env',
    '',
    '# Use machine-readable output (no server prefix):',
    '$ overcast run app-01 uptime --mr',
    '',
    '# Run bundled and custom scripts in sequence:',
    '$ overcast run db-* install/core install/redis ./my/install/script',
    '',
    '# Pass along arbitrary SSH arguments, for example to force a pseudo-tty:',
    '$ overcast run all /my/install/script --ssh-args "-tt"'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name' },
    { name: 'command|file', varName: 'firstCommandOrFile', raw: true }
  ],
  options: [
    { usage: '--env "KEY=VAL KEY=\'1 2 3\'"' },
    { usage: '--user NAME' },
    { usage: '--ssh-key PATH' },
    { usage: '--ssh-args ARGS' },
    { usage: '--continueOnError', default: 'false' },
    { usage: '--machine-readable, --mr', default: 'false' },
    { usage: '--parallel, -p', default: 'false' },
    { usage: '--shell-command "COMMAND"', default: 'bash -s' },
  ],
  run: function (args) {
    args._.unshift(args.firstCommandOrFile);
    delete args.firstCommandOrFile;

    ssh.run(args);
  }
};
