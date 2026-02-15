/**
 * Jest Configuration for Smart Search System
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/smart-search/**/*.js',
    '!src/smart-search/**/*.test.js',
    '!src/smart-search/**/*.spec.js',
    '!src/smart-search/index.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Verbose output
  verbose: true,

  // Test timeout (increased for property-based tests)
  testTimeout: 10000
};
