/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

function createParser(env) {
  var parserClasses = {}
    , parserPools = {};

  var parser = {
    parse: parse
  };
  util.freezeObjects(parser);
  return parser;

  // Implementation ***********************************************************

  function parse(language, queryString) {
    // Get a Parser from the pool, if possible
    var parserPool = parserPools[language] = parserPools[language] || []
      , parser = parserPool.pop();

    if ( !parser ) {
      parser = createParser(language);
      parser.yy = {
        node: createNode,
        steps: createSteps,
        pushStep: pushStep,
        step: createStep,
        localPath: createLocalPath,
        argumentPath: createArgumentPath,
        symbolPath: createSymbolPath,
        pushPath: pushPath
      };
    }

    // Parse the Query, include evaluators in the result
    var steps = parser.parse(queryString);

    // Push the Parser back onto the pool and return the result
    parserPool.push(parser);
    return steps;
  }

  function loadParser(language) {
    var mod;

    if ( !/^[a-zA-Z]+$/.test(language) ) {
      throw new Error("Invalid language name specified '" + language + "'");
    }

    try {
      mod = require('./' + language + '-parser');
    }
    catch ( err ) {
      throw new Error("Language '" + language + "' not supported");
    }

    if ( !mod.Parser ) {
      throw new Error("Parser not exported by module");
    }
    return mod.Parser;
  }

  function createParser(language) {
    var parserClass = parserClasses[language];
    if ( !parserClass ) {
      parserClass = parserClasses[language] = loadParser(language);
    }
    return new parserClass();
  }

  function createNode() {
    var result = util.makeArray(arguments);
    result.isNode = true;
    return result;
  }

  function createSteps() {
    var result = ['steps', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }
  
  function pushStep(steps, step) {
    steps[1].push(step);
    return steps;
  }
  
  function createStep() {
    var result = util.makeArray(arguments);
    result.isStep = true;
    return result;
  }
  
  function createLocalPath() {
    var result = ['locpath', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }

  function createArgumentPath() {
    var result = ['argpath', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }

  function createSymbolPath() {
    var result = ['sympath', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }
  
  function pushPath(path, component) {
    path[1].push(component);
    return path;
  }
}

// Exports
exports.createParser = createParser;
