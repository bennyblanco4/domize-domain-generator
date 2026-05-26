'use strict';

// Simple for-own mock implementation
module.exports = function forOwn(obj, fn) {
  if (!obj) return;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      fn(obj[key], key, obj);
    }
  }
}; 