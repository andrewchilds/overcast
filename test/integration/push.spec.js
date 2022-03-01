import { overcast, tearDown, expectInLog, expectInLogExact } from './utils.js';

describe('push', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should throw an error if name is missing', (nextFn) => {
    overcast('push', (logs) => {
      expectInLog(expect, logs, 'Missing [instance|cluster|all] argument');
      nextFn();
    });
  });

  it('should throw an error if source is missing', (nextFn) => {
    overcast('push MISSING', (logs) => {
      expectInLog(expect, logs, 'No instances found matching "MISSING"');
      nextFn();
    });
  });

  it('should throw an error if dest is missing', (nextFn) => {
    overcast('instance add vm-01 1.2.3.4', () => {
      overcast('push vm-01 /path/to/src', (logs) => {
        expectInLog(expect, logs, 'Missing [dest] argument');
        nextFn();
      });
    });
  });

  it('should otherwise call scp if everything exists', (nextFn) => {
    overcast('push vm-01 /path/to/src /path/to/dest', (logs) => {
      expectInLog(expect, logs, 'mocked call of SCP command');
      expectInLog(expect, logs, 'scp -r -i ');
      expectInLog(expect, logs, ' -P 22 -o StrictHostKeyChecking=no /path/to/src root@1.2.3.4:/path/to/dest');
      nextFn();
    });
  });

  it('should otherwise call rsync if flag is set', (nextFn) => {
    overcast('push vm-01 /path/to/src /path/to/dest --rsync', (logs) => {
      expectInLog(expect, logs, 'mocked call of Rsync command');
      expectInLog(expect, logs, 'rsync -e "ssh -p 22 -i ');
      expectInLog(expect, logs, ' -varuzP --delete --ignore-errors /path/to/src root@1.2.3.4:/path/to/dest');
      nextFn();
    });
  });

});
