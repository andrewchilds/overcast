import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

describe('port', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should complain if no instance name is provided', (nextFn) => {
    overcast('port', (logs) => {
      expectInLog(expect, logs, 'Missing [instance|cluster|all] argument');
      nextFn();
    });
  });

  it('should complain if a missing instance name is provided', (nextFn) => {
    overcast('port MISSING', (logs) => {
      expectInLog(expect, logs, 'No instances found matching "MISSING"');
      nextFn();
    });
  });

  it('should complain if no port is provided', (nextFn) => {
    overcast('instance add vm-01 1.2.3.4', () => {
      overcast('port vm-01', (logs) => {
        expectInLog(expect, logs, 'Missing [port] argument');
        nextFn();
      });
    });
  });

  it('should otherwise update the port', (nextFn) => {
    overcast('instance get vm-01 ssh_port', (logs) => {
      expectInLogExact(expect, logs, '22');
      overcast('port vm-01 22222', (logs) => {
        expectInLog(expect, logs, 'mocked call of SSH command');
        expectInLog(expect, logs, { OVERCAST_PORT: '22' });
        expectInLog(expect, logs, { OVERCAST_ENV: 'new_ssh_port="22222" ' });
        overcast('instance get vm-01 ssh_port', (logs) => {
          expectInLogExact(expect, logs, '22222');
          nextFn();
        });
      });
    });
  });

});
