/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var engine = require('./engine').createEngine()
  , util = require('./util');

var CURRENT_VERSION = "0.0.1"
  , supportedLanguages = ['objeq']
  , grammarFunctions = {};

var slice = Array.prototype.slice;

function junqi(language) {
  var grammarFunction = grammarFunctions[language];
  if ( !grammarFunction ) {
    throw new Error("Grammar '" + language + "' not registered");
  }
  grammarFunction.call(null, slice.call(arguments, 1));
}

function processArguments(args) {
  var result = { }
    , i = 0;

  if ( Array.isArray(args[0]) ) {
    result.data = args[i++];
  }

  if ( typeof args[i] === 'string' ) {
    result.query = args[i++];
  }

  result.params = args.slice(i);
  return result;
}

function registerGrammar(language) {
  return grammarFunctions[language] = grammarFunction;

  function grammarFunction() {
    var processed = processArguments(util.makeArray(arguments))
      , query = processed.query
      , params = processed.params || []
      , data = processed.data || null;

    if ( query ) {
      var parseTree = engine.parse(language, query)
        , compiled = engine.compile(parseTree, params);

      return data ? compiled(data) : compiled;
    }

    return data || null;
  }
}

// Exports
module.exports = junqi.junqi = junqi;
junqi.VERSION = CURRENT_VERSION;
junqi.registerExtension = junqi.registerExtensions = engine.registerExtension;

// Register the supported grammar functions
for ( var i = 0, len = supportedLanguages.length; i < len; i++ ) {
  var language = supportedLanguages[i];
  junqi[language] = registerGrammar(language);
}
