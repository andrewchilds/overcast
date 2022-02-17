import { overcast, tearDown, expectInLog } from './utils.js';

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

});
