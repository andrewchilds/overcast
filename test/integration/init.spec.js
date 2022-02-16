import { overcast, tearDown } from './utils.js';

describe('init', () => {
  beforeAll((done) => {
    tearDown(done);
  });

  it('should allow me to init in the cwd', (done) => {
    overcast('init', (logs) => {
      expect(logs).toContain('Created an .overcast directory');
      done();
    });
  });

  it('should tell me if a config directory already exists', (done) => {
    overcast('init', (logs) => {
      expect(logs).toContain('An .overcast directory already exists');
      done();
    });
  });

});
