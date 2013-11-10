/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

var CURRENT_VERSION = "0.0.12"
  , defaultLanguages = ['objeq', 'jsoniq'];

var slice = Array.prototype.slice;

var funcRegex = /^function\s*([^\(]*)\(([^\)]*)\)\s*\{\s*(\/\*([\s\S]*)\*\/)?/m
  , argNameSplitRegex = /\s*,\s*/m
  , commentPrefixRegex = /^(\s*\*\s+)?(.*)$/;

function createJunqiEnvironment(languages, autoRegister) {
  "use strict";
  
  if ( typeof languages === 'boolean' ) {
    autoRegister = languages;
    languages = undefined;
  }
  
  if ( typeof languages === 'string' ) {
    languages = [languages];
  }
  
  var languageFunctions = {}
    , extensions = {};

  var env = {
    getExtension: getExtension
  };
  
  var parser = require('./parser').createParser(env)
    , compiler = require('./compiler').createCompiler(env);
  
  junqi.junqi = junqi;
  junqi.VERSION = CURRENT_VERSION;
  junqi.createJunqiEnvironment = createJunqiEnvironment;
  junqi.registerExtension = registerExtension;
  junqi.registerExtensions = registerExtensions;

  // Register the supported language functions
  var supportedLanguages = defaultLanguages;
  if ( Array.isArray(languages) ) {
    supportedLanguages = languages;
  }

  for ( var i = supportedLanguages.length; i--; ) {
    var language = supportedLanguages[i];
    junqi[language] = registerLanguage(language);
  }

  util.freezeObjects(env, junqi, languageFunctions);
  return junqi;

  // Implementation ***********************************************************

  function junqi(language) {
    var languageFunction = languageFunctions[language];
    if ( !languageFunction ) {
      throw new Error("Language '" + language + "' not registered");
    }
    languageFunction.apply(null, slice.call(arguments, 1));
  }

  function processArguments(args) {
    var processed = {}
      , i = 0;

    if ( Array.isArray(args[0]) ) {
      processed.data = args[i++];
    }

    if ( typeof args[i] === 'string' ) {
      processed.query = args[i++];
    }
    else if ( typeof args[i] === 'function' ) {
      processArgumentsFunction(args[i++], processed);
    }

    processed.defaultArgs = args.slice(i);
    return processed;
  }

  function processArgumentsFunction(func, processed) {
    var match = funcRegex.exec(func.toString());

    if ( match[1] && match[1].length ) {
      processed.functionName = match[1];
    }
    
    if ( match[2] && match[2].length ) {
      processed.argNames = match[2].split(argNameSplitRegex);
    }

    if ( !match[3] || !match[3].length ) {
      return;
    }
    
    var comments = match[4].split('\n')
      , code = [];

    for ( var i = 0, len = comments.length; i < len; i++ ) {
      match = commentPrefixRegex.exec(comments[i]);
      if ( !match ) {
        // TODO: This should really never happen, maybe we throw an Error?
        continue;
      }
      
      code.push(match[2]);
    }

    processed.query = code.join('\n');
  }

  function registerLanguage(language) {
    languageFunctions[language] = languageFunction;
    return languageFunction;

    function languageFunction() {
      var processed = processArguments(util.makeArray(arguments))
        , data = processed.data
        , query = processed.query
        , functionName = processed.functionName
        , defaultArgs = processed.defaultArgs || []
        , argNames = processed.argNames || [];

      if ( !query ) {
        throw new Error("A query string must be specified");
      }

      var parseTree = parse(language, query)
        , compiled = compile(parseTree, argNames, defaultArgs);

      if ( data ) {
        return compiled(data);
      }
      else if ( autoRegister && functionName && !getExtension(functionName) ) {
        registerExtension(functionName, compiled);
      }
      return compiled;
    }
  }

  function parse(language, query) {
    return parser.parse(language, query);
  }

  function compile(parseTree, argNames, defaultArgs) {
    var evaluator = compiler.compile(parseTree);
    return compiledQuery;

    function compiledQuery(data) {
      var args = util.mergeArrays(defaultArgs, slice.call(arguments, 1))
        , alen = argNames.length
        , params = args.length ? {} : null;
      
      for ( var i = 0, ilen = args.length; i < ilen; i++ ) {
        var arg = args[i];
        params[i] = arg;
        if ( i < alen ) {
          params[argNames[i]] = arg;
        }
      }
      
      return evaluator(data, params);
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
        var key = keys[i];
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

// Export the default junqi environment
module.exports = createJunqiEnvironment();
