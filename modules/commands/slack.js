var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  if (args._.length === 0) {
    return utils.missingParameter('[message]', exports.help);
  }

  // No message sanitizing here:
  args.message = args._.shift();

  var options = {
    channel: args.channel || '#alerts',
    icon_emoji: args['icon-emoji'] || ':cloud:',
    icon_url: args['icon-url'] || null,
    text: args.message,
    username: args.user || 'Overcast'
  };

  var custom_fields = _.extend({}, args);
  var keys = ['_', 'channel', 'command', 'message', 'icon-emoji', 'icon-url', 'message', 'user'];
  _.each(keys, function (key) {
    delete custom_fields[key];
  });

  options.fields = custom_fields;

  exports.send(options);
};

exports.send = function (options) {
  var variables = utils.getVariables();
  if (!variables.SLACK_WEBHOOK_URL) {
    utils.grey('No message sent.');
    return utils.grey('Please add SLACK_WEBHOOK_URL to ' + utils.VARIABLES_JSON + '.');
  }

  var slack = require('slack-notify')(variables.SLACK_WEBHOOK_URL);
  slack.send(options);
  utils.success('Message sent.');
};

exports.signatures = function () {
  return [
    '  overcast slack [message] [options...]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast slack [message] [options...]',
    '  Sends a message to a Slack channel.'.grey,
    '  Expects SLACK_WEBHOOK_URL property to be set in variables.json.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --channel NAME       | #alerts'.grey,
    '    --icon-emoji EMOJI   | :cloud:'.grey,
    '    --icon-url URL       |'.grey,
    '    --user NAME          | Overcast'.grey,
    '    --KEY VALUE          |'.grey,
    '',
    '  Examples:'.grey,
    '  $ overcast slack "Deploy completed." --icon-emoji ":satelite:"'.grey,
    '  $ overcast slack "Server stats" --channel "#general" --cpu "0.54 0.14 0.09"'.grey
  ]);
};
