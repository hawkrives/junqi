/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

var CURRENT_VERSION = "0.0.2"
  , defaultLanguages = ['objeq'];

var slice = Array.prototype.slice;

function createJunqiEnvironment(languages) {
  var engine = require('./engine').createEngine()
    , grammarFunctions = {};

  junqi.junqi = junqi;
  junqi.VERSION = CURRENT_VERSION;
  junqi.createJunqiEnvironment = createJunqiEnvironment;
  junqi.registerExtension = engine.registerExtension;
  junqi.registerExtensions = engine.registerExtensions;

  // Register the supported grammar functions
  var supportedLanguages = defaultLanguages;
  if ( Array.isArray(languages) ) {
    supportedLanguages = languages;
  }

  for ( var i = 0, len = supportedLanguages.length; i < len; i++ ) {
    var language = supportedLanguages[i];
    junqi[language] = registerGrammar(language);
  }

  return junqi;

  function junqi(language) {
    var grammarFunction = grammarFunctions[language];
    if ( !grammarFunction ) {
      throw new Error("Grammar '" + language + "' not registered");
    }
    grammarFunction.apply(null, slice.call(arguments, 1));
  }

  function processArguments(args) {
    var result = {}
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
    grammarFunctions[language] = grammarFunction;
    return grammarFunction;

    function grammarFunction() {
      var processed = processArguments(util.makeArray(arguments))
        , data = processed.data
        , query = processed.query
        , params = processed.params || [];

      if ( !query ) {
        throw new Error("A query string must be specified");
      }

      var parseTree = engine.parse(language, query)
        , compiled = engine.compile(parseTree, params);

      return data ? compiled(data) : compiled;
    }
  }
}

// Export the default junqi environment
module.exports = createJunqiEnvironment();
