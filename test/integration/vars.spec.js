import { overcast, tearDown, expectInLog } from './utils.js';

describe('vars', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('set', () => {
    it('should set vars', (nextFn) => {
      overcast('vars set TEST_NAME test_value', (logs) => {
        expectInLog(expect, logs, 'Variable "TEST_NAME" saved');
        nextFn();
      });
    });
  });

  describe('get', () => {
    it('should get vars', (nextFn) => {
      overcast('vars get TEST_NAME', (logs) => {
        expectInLog(expect, logs, 'test_value');
        nextFn();
      });
    });

    it('should handle missing vars', (nextFn) => {
      overcast('vars get BOGUS', (logs) => {
        expectInLog(expect, logs, 'Variable "BOGUS" not found');
        nextFn();
      });
    });
  });

  describe('delete', () => {
    it('should delete vars', (nextFn) => {
      overcast('vars delete TEST_NAME', () => {
        overcast('vars get TEST_NAME', (logs) => {
          expectInLog(expect, logs, 'Variable "TEST_NAME" not found');
          nextFn();
        });
      });
    });

    it('should handle missing vars', (nextFn) => {
      overcast('vars delete MISSING_NAME', (logs) => {
        expectInLog(expect, logs, 'Variable "MISSING_NAME" not found');
        nextFn();
      });
    });
  });
});
