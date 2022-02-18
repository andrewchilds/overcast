import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

describe('tunnel', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should throw an error if instance is missing', (nextFn) => {
    overcast('tunnel', (logs) => {
      expectInLog(expect, logs, 'Missing [instance] argument');
      nextFn();
    });
  });

  it('should throw an error if instance is missing', (nextFn) => {
    overcast('tunnel MISSING', (logs) => {
      expectInLog(expect, logs, 'No instance found matching "MISSING"');
      nextFn();
    });
  });

  it('should throw an error if dest is missing', (nextFn) => {
    overcast('instance add vm-01 1.2.3.4', () => {
      overcast('tunnel vm-01', (logs) => {
        expectInLog(expect, logs, 'Missing [local-port((:hostname):remote-port)...] argument');
        nextFn();
      });
    });
  });

  it('should handle [port] syntax', (nextFn) => {
    overcast('tunnel vm-01 5000', (logs) => {
      expectInLog(expect, logs, 'mocked call of SSH command');
      expectInLog(expect, logs, '-p 22 -o StrictHostKeyChecking=no -L 5000:127.0.0.1:5000 root@1.2.3.4 -N');
      nextFn();
    });
  });

  it('should handle [port:port] syntax', (nextFn) => {
    overcast('tunnel vm-01 8080:80', (logs) => {
      expectInLog(expect, logs, 'mocked call of SSH command');
      expectInLog(expect, logs, '-p 22 -o StrictHostKeyChecking=no -L 8080:127.0.0.1:80 root@1.2.3.4 -N');
      nextFn();
    });
  });

});
