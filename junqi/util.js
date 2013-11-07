/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Use the prototypes rather than trusting instances
var slice = Array.prototype.slice
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

function createShadowedArray(array, params) {
  var result = []
    , i;
  
  if ( params ) {
    // Inheriting Parameters
    for ( i = array.length; i--; ) {
      result[i] = { obj: array[i], params: Object.create(params) }
    }
  }
  else {
    for ( i = array.length; i--; ) {
      result[i] = { obj: array[i], params: {} }
    }    
  }
  return result;
}

function createObjectArray(array) {
  var result = [];
  for ( var i = array.length; i--; ) {
    result[i] = array[i].obj;
  }
  return result;
}

function freezeObjects() {
  for ( var i = arguments.length; i--; ) {
    Object.freeze(arguments[i]);
  }  
}

// Exports
exports.makeArray = makeArray;
exports.mergeArrays = mergeArrays;
exports.createShadowedArray = createShadowedArray;
exports.createObjectArray = createObjectArray;
exports.freezeObjects = freezeObjects;
