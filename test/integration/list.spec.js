import { overcast, tearDown } from './utils.js';

describe('list', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  it('should display nothing when no clusters are defined', (done) => {
    overcast('list', (logs) => {
      expect(logs).toContain('No clusters found');
      done();
    });
  });

  it('should display info when clusters are defined', (done) => {
    overcast('cluster add list-test', () => {
      overcast('list', (logs) => {
        expect(logs).toContain('list-test');
        done();
      });
    });
  });

  it('should display nothing after the test cluster is removed', (done) => {
    overcast('cluster remove list-test', () => {
      overcast('list', (logs) => {
        expect(logs).toContain('No clusters found');
        done();
      });
    });
  });
});
