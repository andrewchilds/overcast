import { overcast, tearDown, expectInLog, expectNotInLog } from './utils.js';

describe('virtualbox', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('create', () => {
    it('should create an instance', (nextFn) => {
      overcast('virtualbox create TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" (192.168.100.102) saved');
        expectInLog(expect, logs, 'Connection established');
        overcast('list', (logs) => {
          expectInLog(expect, logs, '(root@192.168.100.102:22)');
          nextFn();
        });
      });
    });

    it('should not allow duplicate instance names', (nextFn) => {
      overcast('virtualbox create TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" already exists');
        nextFn();
      });
    });
  });

  describe('boot', () => {
    it('should boot an instance', (nextFn) => {
      overcast('virtualbox boot TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" booted');
        nextFn();
      });
    });
  });

  describe('reboot', () => {
    it('should reboot an instance', (nextFn) => {
      overcast('virtualbox reboot TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" rebooted');
        nextFn();
      });
    });
  });

  describe('shutdown', () => {
    it('should shutdown an instance', (nextFn) => {
      overcast('virtualbox shutdown TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" has been shut down');
        nextFn();
      });
    });
  });

  describe('destroy', () => {
    it('should destroy an instance', (nextFn) => {
      overcast('virtualbox destroy TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'Instance "TEST_NAME" destroyed');
        overcast('list', (logs) => {
          expectNotInLog(expect, logs, '(root@192.168.100.102:22)');
          nextFn();
        });
      });
    });
  });

});
