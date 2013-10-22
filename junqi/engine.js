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
var filter = Array.prototype.filter
  , slice = Array.prototype.slice;

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
    var steps = compiler.compile(parseTree);
    return compiledQuery;

    function compiledQuery(data) {
      if ( !Array.isArray(data) ) {
        throw new Error("First parameter must be an Array");
      }

      var params = util.mergeArrays(defaultParams, slice.call(arguments, 1));
      return processQuery(data, steps, params);
    }
  }

  function registerExtensions(hash) {
    var keys = Object.keys(hash);
    for ( var i = keys.length; i--; ) {
      var key = keys[i];
      registerExtension(key, hash[key]);
    }
  }

  function registerExtension(name, func) {
    if ( typeof name === 'function' ) {
      func = name;
      name = func.name;
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

  function processQuery(source, steps, params) {
    var results = util.createShadowedArray(source)
      , ctx = { source: source, params: params };

    for ( var i = 0, ilen = steps.length; i < ilen; i++ ) {
      results = processStep(ctx, results, steps[i]);
    }

    return util.createObjectArray(results);
  }

  function processStep(ctx, source, step) {
    return evalResults(source);

    // Result Evaluation Functions ********************************************

    function evalResults(source) {
      var stepType = step[0]
        , evaluator = step[1]
        , result = []
        , elem, aliases
        , i, idx, ilen;

      switch ( stepType ) {
        case 'sort':
        case 'aggregate':
          return evaluator(ctx, source);

        case 'filter':
          for ( i = 0, idx = 0, ilen = source.length; i < ilen; i++ ) {
            elem = source[i];
            if ( evaluator(ctx, elem.aliases, elem.obj) ) {
              result[idx++] = elem;
            }
          }
          return result;

        case 'select':
          for ( i = 0, idx = 0, ilen = source.length; i < ilen; i++ ) {
            elem = source[i];
            aliases = elem.aliases;
            
            var selectResult = evaluator(ctx, aliases, elem.obj);
            for ( var j = 0, jlen = selectResult.length; j < jlen; j++ ) {
              result[idx++] = { obj: selectResult[j], aliases: aliases };
            }
          }
          return result;

        default:
          throw new Error("Invalid step type '" + stepType + "'");
      }
    }
  }
}

// Exports
exports.createEngine = createEngine;
