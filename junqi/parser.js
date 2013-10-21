/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

var parserClasses = {}
  , parserPools = {};

function parse(engine, language, queryString) {
  // Get a Parser from the pool, if possible
  var parserPool = parserPools[language] = parserPools[language] || []
    , parser = parserPool.pop();

  if ( !parser ) {
    parser = createParser(language);
    parser.yy = {
      node: yynode,
      path: yypath
    };
  }

  // Parse the Query, include evaluators in the result
  var steps = parser.parse(queryString);

  // Push the Parser back onto the pool and return the result
  parserPool.push(parser);
  return steps;
}

function loadParser(language) {
  if ( !/^[a-zA-Z]+$/.test(language) ) {
    throw new Error("Invalid language name specified '" + language + "'");
  }

  try {
    var mod = require('./' + language + '-parser');
    if ( !mod.Parser ) {
      throw new Error("Parser not exported by module");
    }
    return mod.Parser;
  }
  catch ( err ) {
    throw new Error("Language '" + language + "' not supported");
  }
}

function createParser(language) {
  var parserClass = parserClasses[language];
  if ( !parserClass ) {
    parserClass = parserClasses[language] = loadParser(language);
  }
  return new parserClass();
}

function yynode() {
  var result = util.makeArray(arguments);
  result.isNode = true;
  return result;
}

function yypath() {
  // 'this' is the Parser's YY object
  var result = ['path'].concat(util.makeArray(arguments));
  result.isNode = true;
  return result;
}

// Exports
exports.parse = parse;
