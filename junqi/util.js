/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Use the prototypes rather than trusting instances
var map = Array.prototype.map
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice;

function makeArray(arr) {
  return slice.call(arr, 0);
}

function mergeArrays(arr1, arr2) {
  var spliceArgs = [0, arr2.length].concat(arr2)
    , result = slice.call(arr1, 0);
  splice.apply(result, spliceArgs);
  return result;
}

function createShadowedArray(array) {
  return map.call(array, createShadowedItem);

  function createShadowedItem(obj) {
    return {
      obj: obj,
      aliases: {}
    };
  }
}

function createObjectArray(array) {
  return map.call(array, createObjectItem);

  function createObjectItem(elem) {
    return elem.obj;
  }
}

// Exports
exports.makeArray = makeArray;
exports.mergeArrays = mergeArrays;
exports.createShadowedArray = createShadowedArray;
exports.createObjectArray = createObjectArray;
