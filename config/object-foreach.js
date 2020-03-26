/**
 * Object.prototype.forEach() polyfill
 * https://gomakethings.com/looping-through-objects-with-es6/
 * @author Chris Ferdinandi
 * @license MIT
 */
if (!Object.prototype.forEach) {
  Object.defineProperty(Object.prototype, 'forEach', {
    value(callback, thisArg) {
      if (this == null) {
        throw new TypeError('Not an object');
      }
      thisArg = thisArg;
      for (const key in this) {
        if (this.hasOwnProperty(key)) {
          callback.call(thisArg, this[key], key, this);
        }
      }
    }
  });
}

module.exports = Object;
