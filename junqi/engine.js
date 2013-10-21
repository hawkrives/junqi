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
  , map = Array.prototype.map
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice;

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
    for ( var key in hash ) {
      if ( !hash.hasOwnProperty(key) ) {
        continue;
      }
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
      , ctx = {};

    Object.defineProperties(ctx, {
      source: {
        value: source
      },
      params: {
        value: params
      }
    });

    for ( var i = 0, ilen = steps.length; i < ilen; i++ ) {
      results = processStep(ctx, results, steps[i]);
    }

    return util.createObjectArray(results);
  }

  function processStep(ctx, source, step) {
    var evaluator = step.evaluator
      , selector = step.selector
      , sorter = step.sorter
      , sortFirst = step.sortFirst
      , aggregator = step.aggregator;

    return evalResults(source);

    // Result Evaluation Functions ********************************************

    function evalResults(source) {
      var evaluated, selected, aggregated;

      // Evaluation Step
      if ( evaluator ) {
        // In this case, we need to sort between filtering and selecting
        evaluated = filter.call(source, evalElement);
      }
      else {
        // Otherwise take a snapshot of the source
        evaluated = slice.call(source, 0);
      }

      // Pre-Select Sorting Step
      if ( sorter && sortFirst ) {
        sorter(ctx, evaluated);
      }

      // Select Step
      if ( selector ) {
        selected = [];
        for ( var i = 0, ilen = evaluated.length; i < ilen; i++ ) {
          var elem = evaluated[i]
            , obj = elem.obj
            , aliases = elem.aliases
            , selectResult = selector(ctx, aliases, obj);

          selectResult = map.call(selectResult, createSelectionBinder(aliases));
          spliceArrayItems(selected, selectResult);
        }
      }
      else {
        selected = evaluated;
      }

      // Post-Select Sorting Step
      if ( sorter && !sortFirst ) {
        sorter(ctx, selected);
      }

      // Aggregation Step
      aggregated = aggregator ? aggregator(ctx, selected) : selected;

      return aggregated;
    }

    function createSelectionBinder(aliases) {
      return selectionBinder;
      function selectionBinder(item) {
        return {
          obj: item,
          aliases: aliases
        };
      }
    }

    function evalElement(elem) {
      return evaluator(ctx, elem.aliases, elem.obj);
    }

    function spliceArrayItems(arr, items) {
      var spliceArgs = [arr.length, 0].concat(items);
      splice.apply(arr, spliceArgs);
    }
  }
}

// Exports
exports.createEngine = createEngine;
