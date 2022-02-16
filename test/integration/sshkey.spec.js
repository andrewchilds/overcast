import { overcast, tearDown } from './utils.js';

describe('sshkey', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('without a name set', () => {
    it('should complain and fail', (done) => {
      overcast('sshkey create', (logs) => {
        expect(logs).toContain('Missing [name] argument.');
        done();
      });
    });
  });

  describe('with an existing name provided', () => {
    it('should complain and fail', (done) => {
      overcast('sshkey create overcast', (logs) => {
        expect(logs).toContain('The key "overcast" already exists.');
        done();
      });
    });
  });

  describe('with a correct new name set', () => {
    it('should create the new key', (done) => {
      overcast('sshkey create myNewKey', (logs) => {
        expect(logs).toContain('Created new SSH key at');
        done();
      });
    });
  });

});
