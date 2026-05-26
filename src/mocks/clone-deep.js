'use strict';

// Simple clone-deep mock implementation
module.exports = function cloneDeep(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => cloneDeep(item));
  }

  const result = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = cloneDeep(value[key]);
    }
  }
  
  return result;
}; 