/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

// Use the prototypes rather than trusting instances
var slice = Array.prototype.slice;

function createEngine() {
  var extensions = {};

  var self = {
    parse: parse,
    compile: compile,
    registerExtensions: registerExtensions,
    registerExtension: registerExtension,
    getExtension: getExtension
  };

  var parser = require('./parser').createParser(self)
    , compiler = require('./compiler').createCompiler(self);

  return self;

  function parse(language, query) {
    return parser.parse(language, query);
  }

  function compile(parseTree, defaultParams) {
    var evaluator = compiler.compile(parseTree);
    return compiledQuery;

    function compiledQuery(data) {
      if ( !Array.isArray(data) ) {
        throw new Error("First parameter must be an Array");
      }

      var params = util.mergeArrays(defaultParams, slice.call(arguments, 1))
        , ctx = { source: data, params: params }
        , aliases = {};
      
      return evaluator(ctx, aliases, data);
    }
  }

  function registerExtensions(extensions) {
    var i;
    if ( Array.isArray(extensions) ) {
      for ( i = extensions.length; i--; ) {
        registerExtension(extensions[i]);
      }
    }
    else {
      var keys = Object.keys(extensions);
      for ( i = keys.length; i--; ) {
        var key = extensions[i];
        registerExtension(key, extensions[key]);
      }
    }
  }

  function registerExtension(name, func) {
    if ( typeof name === 'function' ) {
      func = name;
      name = func.name && func.name.length ? func.name : null;
    }
    if ( typeof name !== 'string' || typeof func !== 'function' ) {
      throw new Error("A name and function are required");
    }
    extensions[name.toLowerCase()] = func;
  }

  function getExtension(name) {
    var func = extensions[name.toLowerCase()];
    if ( typeof func !== 'function' ) {
      throw new Error("Extension '" + name + "' does not exist!");
    }
    return func;
  }
}

// Exports
exports.createEngine = createEngine;
