/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var slice = Array.prototype.slice;

function createNodeFilter(query, callback) {
  return nodeFilter;

  function nodeFilter(err, data) {
    var args = slice.call(arguments, 1)
      , wrapped = false;

    if ( err ) {
      callback(err, null);
      return;
    }

    // If the payload isn't an array, wrap it
    if ( !Array.isArray(data) ) {
      args[0] = [data];
      wrapped = true;
    }

    var result = query.apply(null, slice.call(arguments, 1));
    if ( wrapped && result.length <= 1 ) {
      result = result[0];
    }

    callback(null, result);
  }
}

// Exports
exports.createNodeFilter = createNodeFilter;
