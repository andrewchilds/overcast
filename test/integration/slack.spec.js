import { overcast, tearDown, expectInLog } from './utils.js';

describe('slack', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('without a message set', () => {
    it('should complain', (nextFn) => {
      overcast('slack', (logs) => {
        expectInLog(expect, logs, 'Missing [message] argument');
        nextFn();
      });
    });
  });

  describe('without a token set', () => {
    it('should complain', (nextFn) => {
      overcast('slack "Hello!"', (logs) => {
        expectInLog(expect, logs, 'Please add SLACK_WEBHOOK_URL');
        nextFn();
      });
    });
  });

  describe('with a valid message and token set', () => {
    it('should try to send the slack message', (nextFn) => {
      overcast('vars set SLACK_WEBHOOK_URL https://example.slack.com', () => {
        overcast('slack "Hello!" --channel "#random" --ram "256mb"', (logs) => {
          expectInLog(expect, logs, 'Message sent to Slack');
          expectInLog(expect, logs, '"text":"Hello!"');
          expectInLog(expect, logs, '"channel":"#random"');
          expectInLog(expect, logs, '"fields":{"ram":"256mb"');
          nextFn();
        });
      });
    });
  });

});
