import { overcast, tearDown } from './utils.js';

describe('vars', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('set', () => {
    it('should set vars', (done) => {
      overcast('vars set TEST_NAME test_value', (logs) => {
        expect(logs).toContain('Variable "TEST_NAME" saved');
        done();
      });
    });
  });

  describe('get', () => {
    it('should get vars', (done) => {
      overcast('vars get TEST_NAME', (logs) => {
        expect(logs).toContain('test_value');
        done();
      });
    });

    it('should handle missing vars', (done) => {
      overcast('vars get BOGUS', (logs) => {
        expect(logs).toContain('Variable "BOGUS" not found');
        done();
      });
    });
  });

  describe('delete', () => {
    it('should delete vars', (done) => {
      overcast('vars delete TEST_NAME', () => {
        overcast('vars get TEST_NAME', (logs) => {
          expect(logs).toContain('Variable "TEST_NAME" not found');
          done();
        });
      });
    });

    it('should handle missing vars', (done) => {
      overcast('vars delete TEST_NAME', (logs) => {
        expect(logs).toContain('Variable "TEST_NAME" not found');
        done();
      });
    });
  });
});
