/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var slice = Array.prototype.slice
  , splice = Array.prototype.splice
  , objectKeys = Object.keys;

/**
 * Converts an array-like object to a real array, potentially starting from
 * a specific index.
 *
 * @param {Array} arr - the array-like object to convert
 * @param {Number} [index] - the optional starting index
 * @returns {Array} the resulting array
 */
function makeArray(arr, index) {
  return slice.call(arr, index || 0);
}

/**
 * Merges two arrays by overlapping arr2 over arr1.  Meaning that if arr2
 * has only two elements, and arr1 has five, then the result will include
 * five elements, the first two coming from arr2 and the rest from arr1.
 * This method is used by junqi to deal with defaulted arguments.
 *
 * @param {Array} arr1 - the target array
 * @param {Array} arr2 - the source array
 * @returns {Array} the merged array
 */
function mergeArrays(arr1, arr2) {
  var spliceArgs = [0, arr2.length].concat(arr2)
    , result = slice.call(arr1, 0);
  splice.apply(result, spliceArgs);
  return result;
}

/**
 * Calls Object.freeze() on all of the arguments passed.
 *
 * @param {...Object} arguments - The Objects to be frozen
 */
function freezeObjects() {
  for ( var i = arguments.length; i--; ) {
    Object.freeze(arguments[i]);
  }
}

/**
 * Performs mixin functionality.  All arguments after target will have their
 * properties shallow copied into target.
 *
 * @param {Object} target - the target object
 * @param {...Object} [source] - The objects to be copied
 * @returns {Object} the target object
 */
function extendObject(target) {
  for ( var i = 1, ilen = arguments.length; i < ilen; i++ ) {
    var source = arguments[i]
      , keys = objectKeys(source);
    for ( var j = keys.length; j--; ) {
      var key = keys[j];
      target[key] = source[key];
    }
  }
  return target;
}


// Exports
exports.makeArray = makeArray;
exports.mergeArrays = mergeArrays;
exports.freezeObjects = freezeObjects;
exports.extendObject = extendObject;
