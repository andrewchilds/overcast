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
      overcast('slack', ({ stdout }) => {
        expect(stdout).toContain('Missing [message] argument.');
        done();
      });
    });
  });

  describe('without a token set', () => {
    it('should complain', (done) => {
      overcast('slack "Hello!"', ({ stdout }) => {
        expect(stdout).toContain('Please add SLACK_WEBHOOK_URL to');
        done();
      });
    });
  });

  describe('with a valid message and token set', () => {
    it('should try to send the slack message', (done) => {
      overcast('vars set SLACK_WEBHOOK_URL https://example.slack.com', () => {
        overcast('slack "Hello!" --channel "#random" --ram "256mb"', ({ stdout }) => {
          expect(stdout).toContain('Message sent to Slack.');
          expect(stdout).toContain('"text":"Hello!"');
          expect(stdout).toContain('"channel":"#random"');
          expect(stdout).toContain('"fields":{"ram":"256mb"}');
          done();
        });
      });
    });
  });

});
