import { overcast, tearDown, expectInLog, expectNotInLog } from './utils.js';

describe('digitalocean', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('create', () => {
    it('should create an instance', (nextFn) => {
      overcast('digitalocean create TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" (192.168.100.101) saved');
        expectInLog(expect, logs, 'Connection established');
        overcast('list', (logs) => {
          expectInLog(expect, logs, '(root@192.168.100.101:22)');
          nextFn();
        });
      });
    });

    it('should not allow duplicate instance names', (nextFn) => {
      overcast('digitalocean create TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" already exists');
        nextFn();
      });
    });
  });

  describe('boot', () => {
    it('should boot an instance', (nextFn) => {
      overcast('digitalocean boot TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" booted');
        nextFn();
      });
    });
  });

  describe('reboot', () => {
    it('should reboot an instance', (nextFn) => {
      overcast('digitalocean reboot TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" rebooted');
        nextFn();
      });
    });
  });

  describe('shutdown', () => {
    it('should shutdown an instance', (nextFn) => {
      overcast('digitalocean shutdown TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" has been shut down');
        nextFn();
      });
    });
  });

  describe('destroy', () => {
    it('should destroy an instance', (nextFn) => {
      overcast('digitalocean destroy TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" destroyed');
        overcast('list', (logs) => {
          expectNotInLog(expect, logs, '(root@192.168.100.101:22)');
          nextFn();
        });
      });
    });
  });

});
