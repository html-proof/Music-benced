/**
 * String Matching Utilities
 * 
 * Provides case-insensitive string matching functions for search operations.
 * These utilities support exact match, starts-with, and contains matching patterns.
 */

/**
 * Check if a string exactly matches the query (case-insensitive)
 * @param {string} str - The string to check
 * @param {string} query - The query to match against
 * @returns {boolean} True if exact match, false otherwise
 */
function exactMatch(str, query) {
  if (typeof str !== 'string' || typeof query !== 'string') {
    return false;
  }
  return str.toLowerCase() === query.toLowerCase();
}

/**
 * Check if a string starts with the query (case-insensitive)
 * @param {string} str - The string to check
 * @param {string} query - The query to match against
 * @returns {boolean} True if starts with query, false otherwise
 */
function startsWithMatch(str, query) {
  if (typeof str !== 'string' || typeof query !== 'string') {
    return false;
  }
  return str.toLowerCase().startsWith(query.toLowerCase());
}

/**
 * Check if a string contains the query (case-insensitive)
 * @param {string} str - The string to check
 * @param {string} query - The query to match against
 * @returns {boolean} True if contains query, false otherwise
 */
function containsMatch(str, query) {
  if (typeof str !== 'string' || typeof query !== 'string') {
    return false;
  }
  return str.toLowerCase().includes(query.toLowerCase());
}

module.exports = {
  exactMatch,
  startsWithMatch,
  containsMatch
};
