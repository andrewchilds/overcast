import * as store from '../../src/store.js';
import * as utils from '../../src/utils.js';

describe('utils', () => {
  beforeEach(() => {
    store.clearStore();
  });

  describe('getNextColor', () => {
    it('sends back the next color and advances the state count', () => {
      expect(utils.getNextColor()).toBe('cyan');
      expect(utils.getNextColor()).toBe('green');
      expect(utils.getNextColor()).toBe('red');
      expect(utils.getNextColor()).toBe('yellow');
      expect(utils.getNextColor()).toBe('magenta');
      expect(utils.getNextColor()).toBe('blue');
      expect(utils.getNextColor()).toBe('gray');
      expect(utils.getNextColor()).toBe('cyan');
    })
  });

  describe('deepClone', () => {
    it('creates a deep clone of an object', () => {
      const original = {
        foo: {
          a: 1,
          b: new Date()
        },
        bar: true,
        arr: ['a', 'b', { a: 9 }],
        b: null,
        c: undefined,
        d: 123,
        e: 234.56,
        f: 'asdfjkh',
        fn: () => { return true; },
        r: /[a-z]/i,
      };
      const clone = utils.deepClone(original);
      expect(clone).toEqual(original);
      expect(clone.foo.b).not.toBe(original.foo.b);
      expect(clone.foo.b.getTime()).toBe(original.foo.b.getTime());
      expect(clone.arr).not.toBe(original.arr);
      expect(clone.arr).toEqual(original.arr);
      expect(clone.arr[2].a).toBe(original.arr[2].a);
      expect(clone.fn).toBe(original.fn);
      expect(clone.r).toEqual(original.r);
      expect(clone.r).not.toBe(original.r);
      expect(clone.fn()).toBe(original.fn());
    });

    it('makes a deep clone of an array', () => {
      const original = [1, 2, { a: 1, b: 2 }];
      let clone = utils.deepClone(original);
      expect(clone).not.toBe(original);
      expect(clone).toEqual(original);
    });

    it('makes a clone of an object with object references', () => {
      const other = { a: 1, b: 2 };
      let original = {
        a: other,
        b: {
          a: other
        }
      };
      const clone = utils.deepClone(original);
      expect(clone).toEqual(original);
      other.a = 3;
      expect(clone.a.a).toBe(1);
      expect(clone.b.a.a).toBe(1);
    });

    it('makes a clone of a string', () => {
      let original = 'hello';
      const clone = utils.deepClone(original);
      expect(clone).toBe(original);
      expect(clone).toEqual(original);
      original = 'updated';
      expect(clone).not.toBe(original);
    });

    it('handles undefined', () => {
      const original = undefined;
      const clone = utils.deepClone(original);
      expect(clone).toBe(original);
      expect(clone).toEqual(original);
    });

    it('handles null', () => {
      const original = null;
      const clone = utils.deepClone(original);
      expect(clone).toBe(original);
      expect(clone).toEqual(original);
    });
  });

  describe('findMatchingInstances', () => {
    const subject = utils.findMatchingInstances;
    const clusters = {
      dummy: {
        instances: {
          'dummy.01': { name: 'dummy.01' },
          'dummy.02': { name: 'dummy.02' }
        }
      },
      test: {
        instances: {
          'test-01': { name: 'test-01' },
          'test-02': { name: 'test-02' },
          'test-03': { name: 'test-03' }
        }
      }
    };

    describe('name is "all"', () => {
      it('should return all instances', () => {
        expect(subject('all', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'dummy.02' },
          { name: 'test-01' },
          { name: 'test-02' },
          { name: 'test-03' }
        ]);
      });
    });

    describe('name matches a cluster', () => {
      it('should return all instances from that cluster', () => {
        expect(subject('dummy', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'dummy.02' }
        ]);
      });
    });

    describe('name matches an instance', () => {
      it('should return the matching instance', () => {
        expect(subject('test-03', clusters)).toEqual([
          { name: 'test-03' }
        ]);
      });
    });

    describe('name includes a wildcard', () => {
      it('should return the matching instances', () => {
        expect(subject('test-0*', clusters)).toEqual([
          { name: 'test-01' },
          { name: 'test-02' },
          { name: 'test-03' }
        ]);
        expect(subject('*01', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'test-01' }
        ]);
        expect(subject('*.*', clusters)).toEqual([
          { name: 'dummy.01' },
          { name: 'dummy.02' }
        ]);
      });
    });

  });

  describe('tokenize', () => {
    const subject = utils.tokenize;

    it('should handle double-quoted tokens', () => {
      expect(subject('"my first token" second, third'))
        .toEqual(['my first token', 'second,', 'third']);
    });

    it('should handle single-quotes in double-quoted tokens and vice-versa', () => {
      return expect(subject('"first token\'s value" \'second "token quote"\' third'))
        .toEqual(['first token\'s value', 'second "token quote"', 'third']);
    });

    it('should handle single-quoted tokens', () => {
      return expect(subject('"my first token" \'my second token\' third'))
        .toEqual(['my first token', 'my second token', 'third']);
    });

    it('should handle simple tokens with irregular spacing', () => {
      expect(subject(' first  second --third'))
        .toEqual(['first', 'second', '--third']);
    });

  });

  describe('sanitize', () => {
    const subject = utils.sanitize;

    it('should sanitize the input string', () => {
      expect(subject('foo ~`!@#$%^&*()-=_+[]\\{}|;:\'",./<>?bar'))
        .toBe('foo *-_.bar');
    });

    it('should handle numbers', () => {
      expect(subject(12345)).toBe('12345');
    });

    it('should return empty strings for null and undefined', () => {
      expect(subject(null)).toBe('');
      expect(subject()).toBe('');
    });
  });
});
