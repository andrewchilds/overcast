import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

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

});
