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
    var steps = compiler.compile(parseTree)
      , queryProcessor = createQueryProcessor(steps);
    return compiledQuery;

    function compiledQuery(data) {
      if ( !Array.isArray(data) ) {
        throw new Error("First parameter must be an Array");
      }

      var params = util.mergeArrays(defaultParams, slice.call(arguments, 1));
      return queryProcessor(data, params);
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

  function createQueryProcessor(steps) {
    var pipeline = [querySetup]
      , processGroups = false;

    for ( var i = 0, ilen = steps.length; i < ilen; i++ ) {
      var step = steps[i]
        , stepType = step[0]
        , evaluator = step[1];

      if ( processGroups ) {
        evaluator = createGroupEvaluator(evaluator);
      }

      if ( stepType === 'group' ) {
        processGroups = true;
      }

      pipeline.push(evaluator);
    }

    pipeline.push(processGroups ? queryGroupResults : querySetResults);
    return queryProcessor;

    function queryProcessor(data, params) {
      var ctx = { source: data, params: params };
      for ( var i = 0, ilen = pipeline.length; i < ilen; i++ ) {
        data = pipeline[i](ctx, data);
      }
      return data;
    }

    function querySetup(ctx, data) {
      return util.createShadowedArray(data);
    }

    function queryGroupResults(ctx, data) {
      return processObject(data, []);

      function processObject(obj, result) {
        var keys = Object.keys(obj);
        for ( var i = 0, ilen = keys.length; i < ilen; i++ ) {
          var value = obj[keys[i]];
          if ( Array.isArray(value) ) {
            result = result.concat(util.createObjectArray(value));
          }
          else {
            result = processObject(value, result);
          }
        }
        return result;
      }
    }

    function querySetResults(ctx, data) {
      return util.createObjectArray(data);
    }
  }

  function createGroupEvaluator(evaluator) {
    return groupEvaluator;

    function groupEvaluator(ctx, data) {
      var keys = Object.keys(data);
      for ( var i = 0, ilen = keys.length; i < ilen; i++ ) {
        var key = keys[i]
          , subset = data[key];

        if ( Array.isArray(subset) ) {
          data[key] = evaluator(ctx, subset);
        }
        else {
          data[key] = groupEvaluator(ctx, subset);
        }
      }
      return data;
    }
  }
}

// Exports
exports.createEngine = createEngine;
