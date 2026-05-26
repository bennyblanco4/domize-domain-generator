'use strict';

// Simple shallow-clone mock implementation
module.exports = function shallowClone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return [...value];
  }

  return Object.assign({}, value);
}; 