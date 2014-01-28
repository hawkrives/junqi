/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var slice = Array.prototype.slice;

/**
 * Creates a conduit between a junqi compiled query and a typical node.js
 * style callback (err, result*).  This is useful if you want to post-process
 * database or similar results before handing them off to your real callback.
 *
 * Any arguments provided to the generated function will be passed to both
 * the junqi query and to the callback.  The first argument after `err` is
 * considered the data to be manipulated.
 *
 * @param query The query to perform
 * @param callback the callback to chain
 * @returns {nodeFilter}
 */
function createNodeFilter(query, callback) {
  return nodeFilter;

  function nodeFilter(err, data) {
    if ( err ) {
      callback.apply(null, arguments);
      return;
    }

    var args = slice.call(arguments, 1);
    args[0] = query.apply(null, args);

    args.unshift(null);
    callback.apply(null, args);
  }
}

// Exports
exports.createNodeFilter = createNodeFilter;
