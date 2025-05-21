import { overcast, tearDown, expectInLog, expectNotInLog } from './utils.js';

describe('vultr', () => {

  const instanceName = 'VULTR_TEST_NAME';

  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('create', () => {
    it('should create an instance', (nextFn) => {
      overcast(`vultr create ${instanceName}`, (logs) => {
        expectInLog(expect, logs, `Instance "${instanceName}" (192.168.100.103) saved`);
        expectInLog(expect, logs, 'Connection established');
        overcast('list', (logs) => {
          expectInLog(expect, logs, '(root@192.168.100.103:22)');
          nextFn();
        });
      });
    });

    it('should not allow duplicate instance names', (nextFn) => {
      overcast(`vultr create ${instanceName}`, (logs) => {
        expectInLog(expect, logs, `Instance "${instanceName}" already exists`);
        nextFn();
      });
    });
  });

  describe('boot', () => {
    it('should not allow an invalid instance to be booted', (nextFn) => {
      overcast('vultr boot INVALID_NAME', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });

    it('should boot a valid instance', (nextFn) => {
      overcast(`vultr boot ${instanceName}`, (logs) => {
        expectInLog(expect, logs, `Instance "${instanceName}" booted`);
        nextFn();
      });
    });
  });

  describe('reboot', () => {
    it('should not allow an invalid instance to be rebooted', (nextFn) => {
      overcast('vultr reboot INVALID_NAME', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });

    it('should reboot an instance', (nextFn) => {
      overcast(`vultr reboot ${instanceName}`, (logs) => {
        expectInLog(expect, logs, `Instance "${instanceName}" rebooted`);
        nextFn();
      });
    });
  });

  describe('shutdown', () => {
    it('should not allow an invalid instance to be shut down', (nextFn) => {
      overcast('vultr shutdown INVALID_NAME', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });

    it('should shutdown an instance', (nextFn) => {
      overcast(`vultr shutdown ${instanceName}`, (logs) => {
        expectInLog(expect, logs, `Instance "${instanceName}" has been shut down`);
        nextFn();
      });
    });
  });

  describe('destroy', () => {
    it('should not allow an invalid instance to be destroyed', (nextFn) => {
      overcast('vultr destroy INVALID_NAME', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });

    it('should destroy an instance', (nextFn) => {
      overcast(`vultr destroy ${instanceName}`, (logs) => {
        expectInLog(expect, logs, `Instance "${instanceName}" destroyed`);
        overcast('list', (logs) => {
          expectNotInLog(expect, logs, '(root@192.168.100.103:22)');
          nextFn();
        });
      });
    });
  });

  // Additional Vultr-specific commands

  describe('rebuild', () => {
    it('should not allow an invalid instance to be rebuilt', (nextFn) => {
      overcast('vultr rebuild INVALID_NAME ubuntu_22_04_x64', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });
  });

  describe('resize', () => {
    it('should not allow an invalid instance to be resized', (nextFn) => {
      overcast('vultr resize INVALID_NAME vc2-2c-4gb', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });
  });

  describe('snapshot', () => {
    it('should not allow an invalid instance to be snapshotted', (nextFn) => {
      overcast('vultr snapshot INVALID_NAME test-snapshot', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });
  });

  describe('sync', () => {
    it('should not allow an invalid instance to be synced', (nextFn) => {
      overcast('vultr sync INVALID_NAME', (logs) => {
        expectInLog(expect, logs, 'No instance found matching "INVALID_NAME"');
        nextFn();
      });
    });
  });

  // Listing commands

  describe('instances', () => {
    it('should list instances', (nextFn) => {
      overcast('vultr instances', (logs) => {
        nextFn();
      });
    });
  });

  describe('images', () => {
    it('should list images', (nextFn) => {
      overcast('vultr images', (logs) => {
        nextFn();
      });
    });
  });

  describe('regions', () => {
    it('should list regions', (nextFn) => {
      overcast('vultr regions', (logs) => {
        nextFn();
      });
    });
  });

  describe('plans', () => {
    it('should list plans', (nextFn) => {
      overcast('vultr plans', (logs) => {
        nextFn();
      });
    });
  });

  describe('snapshots', () => {
    it('should list snapshots', (nextFn) => {
      overcast('vultr snapshots', (logs) => {
        nextFn();
      });
    });
  });
});
