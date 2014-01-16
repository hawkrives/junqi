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
  "use strict";
  
  var parserClasses = {}
    , parserPools = {};

  var parserInterface = Object.freeze({
    node: createNode,
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
    parse: parse
  });

  // Implementation ***********************************************************
  
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
    var result = ['local', [null].concat(util.makeArray(arguments))];
    result.isNode = true;
    return result;
  }

  function createParamPath() {
    var result = ['param', util.makeArray(arguments)];
    result.isNode = true;
    return result;
  }

  function pathPush(path, component) {
    path[1].push(component);
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
