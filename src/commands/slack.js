import SlackNotify from 'slack-notify';
import * as utils from '../utils.js';
import * as log from '../log.js';

export const commands = {};

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
  run: (args) => {
    const options = {
      channel: args.channel || '#alerts',
      icon_emoji: args['icon-emoji'] || ':cloud:',
      icon_url: args['icon-url'] || null,
      text: args.message,
      username: args.user || 'Overcast'
    };

    const custom_fields = Object.assign({}, args);
    ['_', 'channel', 'command', 'message', 'icon-emoji', 'icon-url', 'message', 'user'].forEach((key) => {
      delete custom_fields[key];
    });

    options.fields = custom_fields;

    send(options);
  }
};

export function send(options) {
  const vars = utils.getVariables();

  if (!vars.SLACK_WEBHOOK_URL) {
    log.faded('No message sent.');
    log.faded(`Please add SLACK_WEBHOOK_URL to ${utils.VARIABLES_JSON}.`);

    return false;
  }

  const slack = SlackNotify(vars.SLACK_WEBHOOK_URL);
  slack.send(options).then(() => {
    log.success('Message sent to Slack.');
  }).catch((err) => {
    log.failure(`Unable to send message to Slack: ${err}`);
  });
}
