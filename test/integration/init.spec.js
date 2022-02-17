import { overcast, tearDown, expectInLog } from './utils.js';

describe('init', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should allow me to init in the cwd', (nextFn) => {
    overcast('init', (logs) => {
      expectInLog(expect, logs, 'Created an .overcast directory');
      nextFn();
    });
  });

  it('should tell me if a config directory already exists', (nextFn) => {
    overcast('init', (logs) => {
      expectInLog(expect, logs, 'An .overcast directory already exists');
      nextFn();
    });
  });

});
