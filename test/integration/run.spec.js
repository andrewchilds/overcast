import { overcast, tearDown, expectInLog, expectInLogExact, expectNotInLog } from './utils.js';

describe('run', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should complain if no instance name is provided', (nextFn) => {
    overcast('run', (logs) => {
      expectInLog(expect, logs, 'Missing [instance|cluster|all] argument');
      nextFn();
    });
  });

  it('should complain if a missing instance name is provided', (nextFn) => {
    overcast('run MISSING', (logs) => {
      expectInLog(expect, logs, 'No instances found matching "MISSING"');
      nextFn();
    });
  });

  it('should complain if no command is provided', (nextFn) => {
    overcast('instance add vm-01 1.2.3.4', () => {
      overcast('run vm-01', (logs) => {
        expectInLog(expect, logs, 'Missing [command|file] argument');
        nextFn();
      });
    });
  });

  it('should otherwise run the command', (nextFn) => {
    overcast('run vm-01 uptime', (logs) => {
      expectInLog(expect, logs, 'mocked call of SSH command');
      expectInLog(expect, logs, { OVERCAST_COMMAND: 'uptime' });
      nextFn();
    });
  });

  describe('SSH key handling', () => {
    afterEach(() => {
      // Clean up env vars after each test
      delete process.env.OVERCAST_SSH_KEY;
      delete process.env.OVERCAST_SSH_USER;
    });

    it('should use explicit --ssh-key when provided', (nextFn) => {
      overcast('run vm-01 uptime --ssh-key /custom/key.pem', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        expectInLog(expect, logs, { OVERCAST_KEY: '/custom/key.pem' });
        nextFn();
      });
    });

    it('should use instance ssh_key when configured', (nextFn) => {
      overcast('instance update vm-01 --ssh-key mykey.key', () => {
        overcast('run vm-01 uptime', (logs) => {
          expectInLog(expect, logs, 'mocked call of SSH command');
          // Should include the key in OVERCAST_KEY
          const logWithKey = logs.find(log =>
            log && typeof log === 'object' && log.OVERCAST_KEY && log.OVERCAST_KEY.includes('mykey.key')
          );
          expect(logWithKey).toBeTruthy();
          nextFn();
        });
      });
    });

    it('should prioritize OVERCAST_SSH_KEY env var over instance config', (nextFn) => {
      process.env.OVERCAST_SSH_KEY = '/env/override/key.pem';

      overcast('run vm-01 uptime', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        expectInLog(expect, logs, { OVERCAST_KEY: '/env/override/key.pem' });
        nextFn();
      });
    });

    it('should prioritize OVERCAST_SSH_USER env var over instance config', (nextFn) => {
      process.env.OVERCAST_SSH_USER = 'envuser';

      overcast('run vm-01 uptime', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        expectInLog(expect, logs, { OVERCAST_USER: 'envuser' });
        nextFn();
      });
    });
  });

});
