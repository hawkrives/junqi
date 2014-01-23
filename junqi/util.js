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

function makeArray(arr, index) {
  return slice.call(arr, index || 0);
}

function mergeArrays(arr1, arr2) {
  var spliceArgs = [0, arr2.length].concat(arr2)
    , result = slice.call(arr1, 0);
  splice.apply(result, spliceArgs);
  return result;
}

function freezeObjects() {
  for ( var i = arguments.length; i--; ) {
    Object.freeze(arguments[i]);
  }
}

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
