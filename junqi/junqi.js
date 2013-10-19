/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var CURRENT_VERSION = "0.0.1";

// Use the prototypes rather than trusting instances
var filter = Array.prototype.filter;
var map = Array.prototype.map;
var slice = Array.prototype.slice;
var splice = Array.prototype.splice;

var parserClasses = {
};

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

// Utility Functions ********************************************************

function makeArray(arr) {
  return slice.call(arr, 0);
}

function mergeArrays(arr1, arr2) {
  var spliceArgs = [0, arr2.length].concat(arr2)
    , result = slice.call(arr1, 0);
  splice.apply(result, spliceArgs);
  return result;
}

// Extension Functions ******************************************************

var ext = {
};

function registerExtension(name, func) {
  var hash = typeof name === 'object' ? name : {};
  if ( typeof name === 'string' && typeof func === 'function' ) {
    hash[name] = func;
  }
  for ( var key in hash ) {
    if ( !hash.hasOwnProperty(key) ) {
      continue;
    }

    var value = hash[key];
    if ( typeof key === 'string' && typeof value === 'function' ) {
      ext[key.toLowerCase()] = value;
    }
  }
}

function getExtension(name) {
  var func = ext[name.toLowerCase()];
  if ( typeof func !== 'function' ) {
    throw new Error("Extension '" + name + "' does not exist!");
  }
  return func;
}

// 'Compilation' Functions **************************************************

var EmptyArray = [];

function arrayEvalTemplate(items) {
  var template = [];
  for ( var i = 0, ilen = items.length; i < ilen; i++ ) {
    var item = items[i], isNode = Array.isArray(item) && item.isNode;
    template.push(isNode ? createEvaluator(item) : item);
  }
  return template;
}

function evalPath(evalRoot, pathComponents) {
  var path = arrayEvalTemplate(pathComponents);
  return function _path(ctx, aliases, obj) {
    var value = evalRoot(ctx, aliases, obj);
    for ( var i = 0, ilen = path.length; i < ilen; i++ ) {
      // If we're drilling in, resolve the first Item
      if ( Array.isArray(value) ) {
        if ( value.length === 0 ) {
          return null;
        }
        value = value[0];
      }
      if ( value === null || value === undefined ) {
        return value;
      }

      var comp = path[i]
        , key = typeof comp === 'function' ? comp(ctx, aliases, obj) : comp;

      value = value[key];
    }
    return value;
  };
}

function evalArgPath(index, pathComponents) {
  return evalPath(evalArgPathRoot, pathComponents);

  function evalArgPathRoot(ctx /* aliases, obj */) {
    return ctx.params[index];
  }
}

function evalSymbolPath(symbol, pathComponents) {
  return evalPath(evalSymbolPathRoot, pathComponents);

  function evalSymbolPathRoot(ctx, aliases, obj) {
    return aliases[symbol];
  }
}

function evalLocalPath(pathComponents) {
  return evalPath(evalLocalPathRoot, pathComponents);

  function evalLocalPathRoot(ctx, aliases, obj) {
    return obj;
  }
}

function createEvaluator(node) {
  if ( !Array.isArray(node) || !node.isNode ) {
    return node;
  }

  // Resolving Operators
  var op = node[0];
  switch ( op ) {
    case 'path':
      var type = node[1];
      switch ( type ) {
        case 'arg':
          return evalArgPath(node[2], node.slice(3));
        case 'local':
          return evalLocalPath(node.slice(2));
        case 'symbol':
          return evalSymbolPath(node[2], node.slice(3));
      }
      break;

    case 'obj':
      return evalObj(objectEvalTemplate(node[1]));

    case 'arr':
      return evalArr(arrayEvalTemplate(node[1]));

    case 'func':
      var func = getExtension(node[1]);
      return evalFunc(func, arrayEvalTemplate(node[2]));
  }

  // Unary Operators
  var n1 = createEvaluator(node[1]), n1Eval, n1Lit;
  typeof n1 === 'function' ? n1Eval = n1 : n1Lit = n1;

  switch ( op ) {
    case 'not':
      return evalNOT();
    case 'neg':
      return evalNEG();
  }

  // Binary Operators
  var n2 = createEvaluator(node[2]), n2Eval, n2Lit;
  typeof n2 === 'function' ? n2Eval = n2 : n2Lit = n2;

  switch ( op ) {
    case 'and':
      return evalAND();
    case 'or':
      return evalOR();
    case 'add':
      return evalADD();
    case 'sub':
      return evalSUB();
    case 'mul':
      return evalMUL();
    case 'div':
      return evalDIV();
    case 'mod':
      return evalMOD();
    case 'eq':
      return evalEQ();
    case 'neq':
      return evalNEQ();
    case 'gt':
      return evalGT();
    case 'gte':
      return evalGTE();
    case 'lt':
      return evalLT();
    case 'lte':
      return evalLTE();
    case 'in':
      return evalIN();
    case 're':
      return evalRE();
    case 'as':
      return evalAS();
  }

  // Ternary Operator
  if ( op === 'tern' ) {
    var n3 = createEvaluator(node[3]), n3Eval, n3Lit;
    typeof n3 === 'function' ? n3Eval = n3 : n3Lit = n3;
    return evalTern();
  }

  // Should hopefully never happen
  throw new Error("Invalid parser node: " + op);

  // Evaluator Generation ***************************************************

  function objectEvalTemplate(hash) {
    var template = {};
    for ( var key in hash ) {
      var item = hash[key], isNode = Array.isArray(item) && item.isNode;
      template[key] = isNode ? createEvaluator(item) : item;
    }
    return template;
  }

  function evalObj(template) {
    return function _obj(ctx, aliases, obj) {
      var result = {};
      for ( var key in template ) {
        var item = template[key];
        if ( typeof item === 'function' ) {
          result[key] = item(ctx, aliases, obj);
        }
        else {
          result[key] = item;
        }
      }
      return result;
    };
  }

  function evalArr(template) {
    return function _arr(ctx, aliases, obj) {
      var result = [];
      for ( var i = 0, ilen = template.length; i < ilen; i++ ) {
        var item = template[i];
        if ( typeof item === 'function' ) {
          result.push(item(ctx, aliases, obj));
        }
        else {
          result.push(item);
        }
      }
      return result;
    };
  }

  function evalFunc(func, template) {
    return function _func(ctx, aliases, obj) {
      var funcArgs = [];
      for ( var i = 0, ilen = template.length; i < ilen; i++ ) {
        var item = template[i];
        if ( typeof item === 'function' ) {
          funcArgs.push(item(ctx, aliases, obj));
        }
        else {
          funcArgs.push(item);
        }
      }
      return func.apply(obj, [ctx].concat(funcArgs));
    };
  }

  function evalNOT() {
    if ( !n1Eval ) {
      return !n1Lit;
    }
    return function _not(ctx, aliases, obj) {
      return !n1Eval(ctx, aliases, obj);
    };
  }

  function evalNEG() {
    if ( !n1Eval ) {
      return -n1Lit;
    }
    return function _neg(ctx, aliases, obj) {
      return -n1Eval(ctx, aliases, obj);
    };
  }

  function evalAND() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit && n2Lit;
    }
    return function _and(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit;
      return !lval ? lval : (n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit);
    };
  }

  function evalOR() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit || n2Lit;
    }
    return function _or(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit;
      return lval ? lval : (n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit);
    };
  }

  function evalADD() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit + n2Lit;
    }
    return function _add(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval + rval;
    };
  }

  function evalSUB() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit - n2Lit;
    }
    return function _sub(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval - rval;
    };
  }

  function evalMUL() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit * n2Lit;
    }
    return function _mul(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval * rval;
    };
  }

  function evalDIV() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit / n2Lit;
    }
    return function _div(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval / rval;
    };
  }

  function evalMOD() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit % n2Lit;
    }
    return function _mod(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval % rval;
    };
  }

  function evalEQ() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit == n2Lit;
    }
    return function _eq(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval == rval;
    };
  }

  function evalNEQ() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit != n2Lit;
    }
    return function _neq(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval != rval;
    };
  }

  function evalGT() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit > n2Lit;
    }
    return function _gt(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval > rval;
    };
  }

  function evalGTE() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit >= n2Lit;
    }
    return function _gte(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval >= rval;
    };
  }

  function evalLT() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit < n2Lit;
    }
    return function _lt(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval < rval;
    };
  }

  function evalLTE() {
    if ( !n1Eval && !n2Eval ) {
      return n1Lit <= n2Lit;
    }
    return function _lte(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      return lval <= rval;
    };
  }

  function evalIN() {
    return n1Eval || n2Eval ? _in : _in();

    function _in(ctx, aliases, obj) {
      var rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
      if ( Array.isArray(rval) ) {
        return rval.indexOf(n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit) !== -1;
      }
      else if ( typeof rval === 'object' ) {
        return (n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit) in rval;
      }
      else if ( rval !== null && rval !== undefined ) {
        return (n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit) == rval;
      }
      return false;
    }
  }

  function evalRE() {
    var regexCache = {};
    return n1Eval || n2Eval ? _re : _re();

    function _re(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit
        , re, key;

      if ( typeof lval !== 'string' && !Array.isArray(lval) ) {
        return false;
      }

      if ( typeof lval === 'string' ) {
        lval = [lval];
      }

      key = lval.join('/');
      re = regexCache[key] || (regexCache[key] = RegExp.apply(null, lval));
      return re.test(rval);
    }
  }

  function evalAS() {
    return function _as(ctx, aliases, obj) {
      var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , rval = n2Lit;  // Can only be a Symbol
      aliases[rval] = lval;
      return lval;
    }
  }

  function evalTern() {
    function _tern(ctx, aliases, obj) {
      var cval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
        , tval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit
        , fval = n3Eval ? n3Eval(ctx, aliases, obj) : n3Lit;
      return cval ? tval : fval;
    }

    return n1Eval || n2Eval || n3Eval ? _tern : _tern();
  }
}

function wrapExpression(node) {
  var result = createEvaluator(node);
  if ( typeof result !== 'function' ) {
    return function _evalWrapper() {
      return result;
    };
  }
  return result;
}

function createSelector(select) {
  var evalSelect = wrapExpression(select[1])
    , temp = [];

  switch ( select[0] ) {
    case 'select':
      return function _select(ctx, aliases, obj) {
        temp[0] = evalSelect(ctx, aliases, obj);
        return temp;
      };

    case 'contract':
      return function _contract(ctx, aliases, obj) {
        var result = evalSelect(ctx, aliases, obj);
        if ( Array.isArray(result) ) {
          if ( result.length ) {
            temp[0] = result[0];
            return temp;
          }
        }
        else if ( result !== null && result !== undefined ) {
          temp[0] = result;
          return temp;
        }
        return EmptyArray;
      };

    case 'expand':
      return function _expand(ctx, aliases, obj) {
        var result = evalSelect(ctx, aliases, obj);
        if ( Array.isArray(result) ) {
          return result;
        }
        else if ( result !== null && result !== undefined ) {
          temp[0] = result;
          return temp;
        }
        return EmptyArray;
      };

    default:
      throw new Error("Invalid selector node: " + select[0]);
  }
}

function createSorter(order) {
  var getPaths = [];
  for ( var i = 0, ilen = order.length; i < ilen; i++ ) {
    var item = order[i];
    getPaths.push(evalLocalPath(item.path.slice(1)));
  }

  return function _sorter(ctx, arr) {
    var comparators = [];
    for ( var i = 0, ilen = order.length; i < ilen; i++ ) {
      var item = order[i];
      comparators.push(createComparator(getPaths[i], item.ascending));
    }

    arr.sort(sortFunction);

    function sortFunction(item1, item2) {
      for ( var i = 0, ilen = comparators.length; i < ilen; i++ ) {
        var result = comparators[i](item1.obj, item2.obj);
        if ( result !== 0 ) {
          return result;
        }
      }
      return 0;
    }

    function createComparator(getPath, ascending) {
      if ( ascending ) {
        return function _ascendingComparator(item1, item2) {
          var val1 = getPath(ctx, item1)
            , val2 = getPath(ctx, item2);
          return val1 == val2 ? 0 : val1 > val2 ? 1 : -1;
        };
      }
      else {
        return function _descendingComparator(item1, item2) {
          var val1 = getPath(ctx, item1)
            , val2 = getPath(ctx, item2);
          return val1 == val2 ? 0 : val1 < val2 ? 1 : -1;
        };
      }
    }
  };
}

function createAggregator(aggregate) {
  var extensions = [];
  for ( var i = 0, ilen = aggregate.length; i < ilen; i++ ) {
    extensions.push(getExtension(aggregate[i]));
  }

  return function _aggregator(ctx, arr) {
    var result = createObjectArray(arr);
    var args = [ctx, result];
    for ( var i = 0, ilen = extensions.length; i < ilen; i++ ) {
      args[1] = result = extensions[i].apply(arr, args);
    }
    if ( !Array.isArray(result) ) {
      if ( result == null ) {
        return EmptyArray;
      }
      result = [result];
    }
    return createShadowedArray(result);
  };
}

// Parsing Functions ********************************************************

function yynode() {
  var result = makeArray(arguments);
  result.isNode = true;
  return result;
}

function yypath() {
  // 'this' is the Parser's YY object
  var result = ['path'].concat(makeArray(arguments));
  result.isNode = true;
  return result;
}

var parserPools = {};

function parse(language, queryString) {
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
  var steps = parser.parse(queryString)
    , result = [];

  for ( var i = 0, ilen = steps.length; i < ilen; i++ ) {
    var step = steps[i];

    result.push({
      evaluator: step.expr && wrapExpression(step.expr),
      selector: step.select && createSelector(step.select),
      sorter: step.order && createSorter(step.order),
      sortFirst: step.sortFirst,
      aggregator: step.aggregate && createAggregator(step.aggregate)
    });
  }

  // Push the Parser back onto the pool and return the result
  parserPool.push(parser);
  return result;
}

// Query Processing Functions ***********************************************

function createShadowedArray(array) {
  return map.call(array, createShadowedItem);

  function createShadowedItem(obj) {
    return {
      obj: obj,
      aliases: {}
    };
  }
}

function createObjectArray(array) {
  return map.call(array, createObjectItem);

  function createObjectItem(elem) {
    return elem.obj;
  }
}

function processQuery(source, steps, params) {
  var results = createShadowedArray(source)
    , ctx = { };

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

  return createObjectArray(results);
}

function processStep(ctx, source, step) {
  var evaluator = step.evaluator
    , selector = step.selector
    , sorter = step.sorter
    , sortFirst = step.sortFirst
    , aggregator = step.aggregator

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
    if ( sorter && sortFirst ) sorter(ctx, evaluated);

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
    if ( sorter && !sortFirst ) sorter(ctx, selected);

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

function processArguments(args, compiled) {
  var i = 0
    , result = { params: [] };

  if ( Array.isArray(args[0]) ) {
    result.source = args[i++];
  }
  else if ( compiled ) {
    throw new Error("No source Array passed to query");
  }

  if ( !compiled && typeof args[i] === 'string' ) {
    result.queryString = args[i++];
  }

  result.params = args.slice(i);
  return result;
}

function compile(language, processed) {
  var queryString = processed.queryString
    , steps = parse(language, queryString);

  return compiledQuery;

  function compiledQuery() {
    var result = processArguments(makeArray(arguments), true)
      , params = mergeArrays(processed.params, result.params);
    return processQuery(result.source, steps, params);
  }
}

// Exported Function ********************************************************

var languageFunctions = {
  "objeq": objeq
};

function objeq() {
  var processed = processArguments(makeArray(arguments))
    , source = processed.source;

  if ( processed.queryString ) {
    var compiled = compile("objeq", processed);
    return source ? compiled(source) : compiled;
  }

  return source;
}

function junqi(language) {
  var languageFunction = languageFunctions[language];
  if ( !languageFunction ) {
    throw new Error("Language '" + language + "' not registered");
  }
  languageFunction.call(null, slice.call(arguments, 1));
}

Object.defineProperties(junqi, {
  objeq: {
    value: objeq
  },
  VERSION: {
    value: CURRENT_VERSION
  },
  registerExtension: {
    value: registerExtension
  }
});

module.exports = junqi.junqi = junqi;
