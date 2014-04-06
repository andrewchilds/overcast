var _ = require('lodash');
var cp = require('child_process');
var utils = require('../utils');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  }

  var count = args.count || 3;

  var instances = utils.findMatchingInstances(args.name);
  utils.handleEmptyInstances(instances, args);

  _.each(instances, function (instance) {
    var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

    cp.exec('ping -c ' + count + ' ' + instance.ip, function (err, stdout) {
      stdout = (stdout + '').trim().split("\n");
      _.each(stdout, function (line) {
        utils.prefixPrint(instance.name, color, line, 'white');
      });
      console.log('');
    });
  });
};

exports.signatures = function () {
  return [
    '  overcast ping [instance|cluster|all]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast ping [instance|cluster|all]',
    '  Ping an instance or cluster.'.grey,
    '',
    '    Option    | Default'.grey,
    '    --count N | 3'.grey,
    '',
    '  Examples:'.grey,
    '  $ overcast ping app.01'.grey,
    '  $ overcast ping db --count 5'.grey
  ]);
};
