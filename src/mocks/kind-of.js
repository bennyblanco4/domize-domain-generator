'use strict';

// Simple kind-of mock implementation
module.exports = function kindOf(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  
  return typeof value;
}; 