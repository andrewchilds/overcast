import { overcast, tearDown } from './utils.js';

describe('slack', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('without a message set', () => {
    it('should complain', (done) => {
      overcast('slack', (logs) => {
        expect(logs).toContain('Missing [message] argument.');
        done();
      });
    });
  });

  describe('without a token set', () => {
    it('should complain', (done) => {
      overcast('slack "Hello!"', (logs) => {
        expect(logs).toContain('Please add SLACK_WEBHOOK_URL to');
        done();
      });
    });
  });

  describe('with a valid message and token set', () => {
    it('should try to send the slack message', (done) => {
      overcast('vars set SLACK_WEBHOOK_URL https://example.slack.com', () => {
        overcast('slack "Hello!" --channel "#random" --ram "256mb"', (logs) => {
          expect(logs).toContain('Message sent to Slack.');
          expect(logs).toContain('"text":"Hello!"');
          expect(logs).toContain('"channel":"#random"');
          expect(logs).toContain('"fields":{"ram":"256mb"}');
          done();
        });
      });
    });
  });

});
