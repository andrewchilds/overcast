import * as store from '../../src/store.js';

describe('store', () => {
  beforeEach(() => {
    store.clearStore();
  });

  describe('increaseSSHCount', () => {
    it('should increase the SSH count', () => {
      expect(store.increaseSSHCount()).toEqual(1);
      expect(store.increaseSSHCount()).toEqual(2);
      expect(store.increaseSSHCount()).toEqual(3);
    });
  });

  describe('decreaseSSHCount', () => {
    it('should decrease the SSH count to zero', () => {
      expect(store.increaseSSHCount()).toEqual(1);
      expect(store.increaseSSHCount()).toEqual(2);
      expect(store.decreaseSSHCount()).toEqual(1);
      expect(store.decreaseSSHCount()).toEqual(0);
      expect(store.decreaseSSHCount()).toEqual(0);
    });
  });
});
