import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

describe('sshkey', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('without a name set', () => {
    it('should complain and fail', (nextFn) => {
      overcast('sshkey create', (logs) => {
        expectInLog(expect, logs, 'Missing [name] argument');
        nextFn();
      });
    });
  });

  describe('with an existing name provided', () => {
    it('should complain and fail', (nextFn) => {
      overcast('sshkey create overcast', (logs) => {
        expectInLog(expect, logs, 'The key "overcast" already exists');
        nextFn();
      });
    });
  });

  describe('with a correct new name set', () => {
    it('should create the new key', (nextFn) => {
      overcast('sshkey create myNewKey', (logs) => {
        expectInLog(expect, logs, 'Created new SSH key at');
        nextFn();
      });
    });
  });

  describe('list', () => {
    it('should list the keys', (nextFn) => {
      overcast('sshkey list', (logs) => {
        expectInLogExact(expect, logs, 'myNewKey');
        expectInLogExact(expect, logs, 'overcast');
        nextFn();
      });
    });
  });

  describe('push', () => {
    beforeAll((done) => {
      // Clean up any leftover env vars from other tests
      delete process.env.OVERCAST_SSH_KEY;
      delete process.env.OVERCAST_SSH_USER;
      overcast('instance add vm-push 1.2.3.4', () => {
        done();
      });
    });

    afterEach(() => {
      delete process.env.OVERCAST_SSH_KEY;
      delete process.env.OVERCAST_SSH_USER;
    });

    it('should append by default (SHOULD_APPEND=true)', (nextFn) => {
      overcast('sshkey push vm-push overcast', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        // Check that SHOULD_APPEND is "true" in OVERCAST_ENV (default behavior)
        const logWithEnv = logs.find(log =>
          log && typeof log === 'object' && log.OVERCAST_ENV && log.OVERCAST_ENV.includes('SHOULD_APPEND="true"')
        );
        expect(logWithEnv).toBeTruthy();
        nextFn();
      });
    });

    it('should overwrite when --overwrite flag is passed', (nextFn) => {
      overcast('sshkey push vm-push overcast --overwrite', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        // Check that SHOULD_APPEND is "false" when overwrite is requested
        const logWithEnv = logs.find(log =>
          log && typeof log === 'object' && log.OVERCAST_ENV && log.OVERCAST_ENV.includes('SHOULD_APPEND="false"')
        );
        expect(logWithEnv).toBeTruthy();
        nextFn();
      });
    });

    it('should overwrite when -o flag is passed', (nextFn) => {
      overcast('sshkey push vm-push overcast -o', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        const logWithEnv = logs.find(log =>
          log && typeof log === 'object' && log.OVERCAST_ENV && log.OVERCAST_ENV.includes('SHOULD_APPEND="false"')
        );
        expect(logWithEnv).toBeTruthy();
        nextFn();
      });
    });
  });
});
