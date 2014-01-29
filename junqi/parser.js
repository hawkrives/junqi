/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

/**
 * Creates a junqi parser interface using the junqi environment object
 * passed to it.
 *
 * @param {Object} env - a junqi environment
 * @returns {Object} the parser interface methods
 */
function createParser(env) {
  "use strict";
  
  var parserClasses = {}
    , parserPools = {};

  var parserInterface = Object.freeze({
    node: createNode,
    block: createBlock,
    blockPush: blockPush,
    steps: createSteps,
    stepsPush: stepsPush,
    step: createStep,
    localPath: createLocalPath,
    paramPath: createParamPath,
    pathPush: pathPush,
    ascending: createAscending,
    descending: createDescending,
    list: createList,
    listPush: listPush,
    map: createMap,
    mapPush: mapPush,
    pair: createPair
  });
  
  return Object.freeze({
    isParserAvailable: isParserAvailable,
    parse: parse
  });

  // Implementation ***********************************************************

  /**
   * Returns whether or not the specified language is recognized by this
   * parser interface.
   *
   * @param {String} language - the language name
   * @returns {Boolean} whether or not the language is recognized
   */
  function isParserAvailable(language) {
    var ParserClass = parserClasses[language];
    if ( ParserClass ) {
      return true;
    }

    try {
      parserClasses[language] = loadLanguageParser(language);
      return true;
    }
    catch ( err ) {
      return false;
    }
  }

  /**
   * Parses a query using the specified language, generating a parse tree
   * that can be handed to the junqi compiler.
   *
   * @param {String} language - the language ('objeq', 'jsoniq', etc...)
   * @param {String} queryString - the query to be parsed
   * @returns {Array} a parse tree
   */
  function parse(language, queryString) {
    // Get a Parser from the pool, if possible
    var parserPool = parserPools[language] || (parserPools[language] = [])
      , parser = parserPool.pop();

    if ( !parser ) {
      parser = createLanguageParser(language);
    }

    // Parse the Query, include evaluators in the result
    var parseTree = parser.parse(queryString);

    // Push the Parser back onto the pool and return the result
    parserPool.push(parser);
    
    return parseTree;
  }

  function loadLanguageParser(language) {
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

  function createLanguageParser(language) {
    var ParserClass = parserClasses[language];
    if ( !ParserClass ) {
      ParserClass = parserClasses[language] = loadLanguageParser(language);
    }
    var parser = new ParserClass();
    parser.yy = util.extendObject({}, parserInterface);
    return parser;
  }
  
  // Parse Tree Node Creation *************************************************
  
  function createNode() {
    var result = util.makeArray(arguments);
    result.isNode = true;
    return result;
  }

  function createBlock() {
    var result = ['block', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }

  function blockPush(block, stmt) {
    block[1].push(stmt);
    return block;
  }

  function createSteps() {
    var result = ['steps', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }
  
  function stepsPush(steps, step) {
    steps[1].push(step);
    return steps;
  }
  
  function createStep() {
    var result = util.makeArray(arguments);
    result.isStep = true;
    return result;
  }
  
  function createLocalPath() {
    var result = ['local', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }

  function createParamPath(param) {
    var result = ['param', param, util.makeArray(arguments, 1)];
    result.isNode = true;
    return result;
  }

  function pathPush(path, component) {
    var lastIdx = path.length - 1;
    path[lastIdx].push(component);
    return path;
  }

  function createAscending(expr) {
    return { expr: expr, ascending: true };
  }

  function createDescending(expr) {
    return { expr: expr };
  }

  function createList() {
    return util.makeArray(arguments);
  }

  function listPush(list, item) {
    list.push(item);  
    return list;
  }

  function createMap() {
    var map = {};
    for ( var i = 0, ilen = arguments.length; i < ilen; i++ ) {
      mapPush(map, arguments[i]);
    }
    return map;
  }

  function mapPush(map, pair) {
    map[pair[0]] = pair[1];
    return map;
  }

  function createPair(key, value) {
    return [key, value];
  }
}

// Exports
exports.createParser = createParser;
