var _ = require('lodash');
var utils = require('../utils');

var commands = {};
exports.commands = commands;

commands.slack = {
  name: 'slack',
  usage: 'overcast slack [message] [options...]',
  description: [
    'Sends a message to a Slack channel.',
    'Requires a SLACK_WEBHOOK_URL property to be set in variables.json.',
    'You can set that with the following command:',
    'overcast var set SLACK_WEBHOOK_URL https://foo.slack.com/blah'
  ],
  examples: [
    '$ overcast slack "Deploy completed." --icon-emoji ":satelite:"',
    '$ overcast slack "Server stats" --channel "#general" --cpu "0.54 0.14 0.09"'
  ],
  required: [
    { name: 'message', raw: true }
  ],
  options: [
    { usage: '--channel NAME', default: '#alerts' },
    { usage: '--icon-emoji EMOJI', default: ':cloud:' },
    { usage: '--icon-url URL' },
    { usage: '--user NAME', default: 'Overcast' },
    { usage: '--KEY VALUE' }
  ],
  run: function (args) {
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
  }
};

exports.send = function (options) {
  var variables = utils.getVariables();
  if (!variables.SLACK_WEBHOOK_URL) {
    utils.grey('No message sent.');
    utils.grey('Please add SLACK_WEBHOOK_URL to ' + utils.VARIABLES_JSON + '.');
    return false;
  }

  var slack = require('slack-notify')(variables.SLACK_WEBHOOK_URL);
  slack.send(options);
  utils.success('Message sent to Slack.');
};
