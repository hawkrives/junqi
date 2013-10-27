/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Use the prototypes rather than trusting instances
var slice = Array.prototype.slice;

function createNodeFilter(query, callback) {
  return nodeFilter;

  function nodeFilter(err, data) {
    if ( err ) {
      callback(err, null);
      return;
    }

    var result = query.apply(null, slice.call(arguments, 1));
    callback(null, result);
  }
}

// Exports
exports.createNodeFilter = createNodeFilter;
