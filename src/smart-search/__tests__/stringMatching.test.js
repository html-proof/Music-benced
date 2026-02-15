const { exactMatch, startsWithMatch, containsMatch } = require('../utils/stringMatching');

describe('String Matching Utilities', () => {
  describe('exactMatch', () => {
    test('should match identical strings', () => {
      expect(exactMatch('hello', 'hello')).toBe(true);
    });

    test('should match case-insensitively', () => {
      expect(exactMatch('Hello', 'hello')).toBe(true);
      expect(exactMatch('HELLO', 'hello')).toBe(true);
      expect(exactMatch('hello', 'HELLO')).toBe(true);
    });

    test('should not match different strings', () => {
      expect(exactMatch('hello', 'world')).toBe(false);
      expect(exactMatch('hello', 'hello world')).toBe(false);
    });

    test('should handle empty strings', () => {
      expect(exactMatch('', '')).toBe(true);
      expect(exactMatch('hello', '')).toBe(false);
      expect(exactMatch('', 'hello')).toBe(false);
    });

    test('should handle special characters', () => {
      expect(exactMatch('hello!', 'hello!')).toBe(true);
      expect(exactMatch('hello?', 'HELLO?')).toBe(true);
      expect(exactMatch('hello-world', 'hello-world')).toBe(true);
    });

    test('should handle unicode characters', () => {
      expect(exactMatch('café', 'café')).toBe(true);
      expect(exactMatch('CAFÉ', 'café')).toBe(true);
      expect(exactMatch('नमस्ते', 'नमस्ते')).toBe(true);
    });

    test('should return false for non-string inputs', () => {
      expect(exactMatch(null, 'hello')).toBe(false);
      expect(exactMatch('hello', null)).toBe(false);
      expect(exactMatch(undefined, 'hello')).toBe(false);
      expect(exactMatch('hello', undefined)).toBe(false);
      expect(exactMatch(123, 'hello')).toBe(false);
      expect(exactMatch('hello', 123)).toBe(false);
    });
  });

  describe('startsWithMatch', () => {
    test('should match when string starts with query', () => {
      expect(startsWithMatch('hello world', 'hello')).toBe(true);
      expect(startsWithMatch('hello', 'hel')).toBe(true);
    });

    test('should match case-insensitively', () => {
      expect(startsWithMatch('Hello World', 'hello')).toBe(true);
      expect(startsWithMatch('HELLO', 'hel')).toBe(true);
      expect(startsWithMatch('hello', 'HEL')).toBe(true);
    });

    test('should not match when string does not start with query', () => {
      expect(startsWithMatch('world hello', 'hello')).toBe(false);
      expect(startsWithMatch('hello', 'world')).toBe(false);
    });

    test('should match exact strings', () => {
      expect(startsWithMatch('hello', 'hello')).toBe(true);
    });

    test('should handle empty strings', () => {
      expect(startsWithMatch('hello', '')).toBe(true);
      expect(startsWithMatch('', 'hello')).toBe(false);
      expect(startsWithMatch('', '')).toBe(true);
    });

    test('should handle special characters', () => {
      expect(startsWithMatch('hello!world', 'hello!')).toBe(true);
      expect(startsWithMatch('hello-world', 'hello-')).toBe(true);
    });

    test('should handle unicode characters', () => {
      expect(startsWithMatch('café au lait', 'café')).toBe(true);
      expect(startsWithMatch('CAFÉ au lait', 'café')).toBe(true);
      expect(startsWithMatch('नमस्ते दुनिया', 'नमस्ते')).toBe(true);
    });

    test('should return false for non-string inputs', () => {
      expect(startsWithMatch(null, 'hello')).toBe(false);
      expect(startsWithMatch('hello', null)).toBe(false);
      expect(startsWithMatch(undefined, 'hello')).toBe(false);
      expect(startsWithMatch('hello', undefined)).toBe(false);
    });
  });

  describe('containsMatch', () => {
    test('should match when string contains query', () => {
      expect(containsMatch('hello world', 'world')).toBe(true);
      expect(containsMatch('hello world', 'lo wo')).toBe(true);
      expect(containsMatch('hello', 'ell')).toBe(true);
    });

    test('should match case-insensitively', () => {
      expect(containsMatch('Hello World', 'world')).toBe(true);
      expect(containsMatch('HELLO WORLD', 'lo wo')).toBe(true);
      expect(containsMatch('hello', 'ELL')).toBe(true);
    });

    test('should not match when string does not contain query', () => {
      expect(containsMatch('hello', 'world')).toBe(false);
      expect(containsMatch('hello', 'xyz')).toBe(false);
    });

    test('should match exact strings', () => {
      expect(containsMatch('hello', 'hello')).toBe(true);
    });

    test('should match strings that start with query', () => {
      expect(containsMatch('hello world', 'hello')).toBe(true);
    });

    test('should handle empty strings', () => {
      expect(containsMatch('hello', '')).toBe(true);
      expect(containsMatch('', 'hello')).toBe(false);
      expect(containsMatch('', '')).toBe(true);
    });

    test('should handle special characters', () => {
      expect(containsMatch('hello!world', '!wo')).toBe(true);
      expect(containsMatch('hello-world-test', '-world-')).toBe(true);
    });

    test('should handle unicode characters', () => {
      expect(containsMatch('café au lait', 'au')).toBe(true);
      expect(containsMatch('CAFÉ au lait', 'AU')).toBe(true);
      expect(containsMatch('नमस्ते दुनिया', 'दुनिया')).toBe(true);
    });

    test('should return false for non-string inputs', () => {
      expect(containsMatch(null, 'hello')).toBe(false);
      expect(containsMatch('hello', null)).toBe(false);
      expect(containsMatch(undefined, 'hello')).toBe(false);
      expect(containsMatch('hello', undefined)).toBe(false);
    });
  });
});
