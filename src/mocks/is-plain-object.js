'use strict';

// Simple is-plain-object mock implementation
module.exports = function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}; 