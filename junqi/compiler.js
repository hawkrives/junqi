/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

var slice = Array.prototype.slice;

function createCompiler(engine) {
  return {
    compile: compile
  };

  function compile(parseTree) {
    var result = [];

    for ( var i = 0, ilen = parseTree.length; i < ilen; i++ ) {
      var stepDefinition = parseTree[i]
        , stepType = stepDefinition[0];

      switch ( stepType ) {
        case 'filter':
          result.push([stepType, createFilter(stepDefinition)]);
          break;

        case 'select':
          result.push([stepType, createSelect(stepDefinition)]);
          break;

        case 'contract':
          result.push([stepType, createContract(stepDefinition)]);
          break;

        case 'expand':
          result.push([stepType, createExpand(stepDefinition)]);
          break;

        case 'sort':
          result.push([stepType, createSort(stepDefinition)]);
          break;

        case 'group':
          result.push([stepType, createGroup(stepDefinition)]);
          break;

        case 'aggregate':
          result.push([stepType, createAggregate(stepDefinition)]);
          break;

        default:
          throw new Error("Invalid step type '" + stepType + "'");
      }
    }
    return result;
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
            return createArgPathEvaluator(node[2], node.slice(3));
          case 'local':
            return createLocalPathEvaluator(node.slice(2));
          case 'symbol':
            return createSymbolPathEvaluator(node[2], node.slice(3));
        }
        break;

      case 'obj':
        return createObjEvaluator(createObjectTemplate(node[1]));

      case 'arr':
        return createArrEvaluator(createArrayTemplate(node[1]));

      case 'func':
        var func = engine.getExtension(node[1]);
        return createFuncEvaluator(func, createArrayTemplate(node[2]));
    }

    // Unary Operators
    var n1 = createEvaluator(node[1]), n1Eval, n1Lit;
    if ( typeof n1 === 'function' ) {
      n1Eval = n1;
    }
    else {
      n1Lit = n1;
    }

    switch ( op ) {
      case 'not':
        return createNotEvaluator();
      case 'neg':
        return createNegEvaluator();
    }

    // Binary Operators
    var n2 = createEvaluator(node[2]), n2Eval, n2Lit;
    if ( typeof n2 === 'function' ) {
      n2Eval = n2;
    }
    else {
      n2Lit = n2;
    }

    switch ( op ) {
      case 'and':
        return createAndEvaluator();
      case 'or':
        return createOrEvaluator();
      case 'add':
        return createAddEvaluator();
      case 'sub':
        return createSubEvaluator();
      case 'mul':
        return createMulEvaluator();
      case 'div':
        return createDivEvaluator();
      case 'mod':
        return createModEvaluator();
      case 'eq':
        return createEqEvaluator();
      case 'neq':
        return createNeqEvaluator();
      case 'gt':
        return createGtEvaluator();
      case 'gte':
        return createGteEvaluator();
      case 'lt':
        return createLtEvaluator();
      case 'lte':
        return createLteEvaluator();
      case 'in':
        return createInEvaluator();
      case 're':
        return createReEvaluator();
      case 'as':
        return createAsEvaluator();
    }

    // Ternary Operator
    if ( op === 'tern' ) {
      var n3 = createEvaluator(node[3]), n3Eval, n3Lit;
      if ( typeof n3 === 'function' ) {
        n3Eval = n3;
      }
      else {
        n3Lit = n3;
      }
      return createTernEvaluator();
    }
    // Should hopefully never happen
    throw new Error("Invalid parser node: " + op);

    // Evaluator Generation ***************************************************

    function createObjectTemplate(hash) {
      var template = {};
      var keys = Object.keys(hash);
      for ( var i = keys.length; i--; ) {
        var key = keys[i];
        var item = hash[key], isNode = Array.isArray(item) && item.isNode;
        template[key] = isNode ? createEvaluator(item) : item;
      }
      return template;
    }

    function createObjEvaluator(template) {
      return objEvaluator;

      function objEvaluator(ctx, aliases, obj) {
        var result = {};
        var keys = Object.keys(template);
        for ( var i = keys.length; i--; ) {
          var key = keys[i]
            , item = template[key];
          if ( typeof item === 'function' ) {
            result[key] = item(ctx, aliases, obj);
          }
          else {
            result[key] = item;
          }
        }
        return result;
      }
    }

    function createArrEvaluator(template) {
      return arrEvaluator;

      function arrEvaluator(ctx, aliases, obj) {
        var result = [];
        for ( var i = template.length; i--; ) {
          var item = template[i];
          if ( typeof item === 'function' ) {
            result[i] = item(ctx, aliases, obj);
          }
          else {
            result[i] = item;
          }
        }
        return result;
      }
    }

    function createFuncEvaluator(func, template) {
      return funcEvaluator;

      function funcEvaluator(ctx, aliases, obj) {
        var funcArgs = [];
        for ( var i = template.length; i--; ) {
          var item = template[i];
          if ( typeof item === 'function' ) {
            funcArgs[i] = item(ctx, aliases, obj);
          }
          else {
            funcArgs[i] = item;
          }
        }
        return func.apply(obj, [ctx].concat(funcArgs));
      }
    }

    function createNotEvaluator() {
      if ( !n1Eval ) {
        return !n1Lit;
      }
      return notEvaluator;

      function notEvaluator(ctx, aliases, obj) {
        return !n1Eval(ctx, aliases, obj);
      }
    }

    function createNegEvaluator() {
      if ( !n1Eval ) {
        return -n1Lit;
      }
      return negEvaluator;

      function negEvaluator(ctx, aliases, obj) {
        return -n1Eval(ctx, aliases, obj);
      }
    }

    function createAndEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit && n2Lit;
      }
      return andEvaluator;

      function andEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit;
        return !lval ? lval : (n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit);
      }
    }

    function createOrEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit || n2Lit;
      }
      return orEvaluator;

      function orEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit;
        return lval ? lval : (n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit);
      }
    }

    function createAddEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit + n2Lit;
      }
      return addEvaluator;

      function addEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval + rval;
      }
    }

    function createSubEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit - n2Lit;
      }
      return subEvaluator;

      function subEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval - rval;
      }
    }

    function createMulEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit * n2Lit;
      }
      return mulEvaluator;

      function mulEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval * rval;
      }
    }

    function createDivEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit / n2Lit;
      }
      return divEvaluator;

      function divEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval / rval;
      }
    }

    function createModEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit % n2Lit;
      }
      return modEvaluator;

      function modEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval % rval;
      }
    }

    function createEqEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit == n2Lit;
      }
      return eqEvaluator;

      function eqEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval == rval;
      }
    }

    function createNeqEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit != n2Lit;
      }
      return neqEvaluator;

      function neqEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval != rval;
      }
    }

    function createGtEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit > n2Lit;
      }
      return gtEvaluator;

      function gtEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval > rval;
      }
    }

    function createGteEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit >= n2Lit;
      }
      return gteEvaluator;

      function gteEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval >= rval;
      }
    }

    function createLtEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit < n2Lit;
      }
      return ltEvaluator;

      function ltEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval < rval;
      }
    }

    function createLteEvaluator() {
      if ( !n1Eval && !n2Eval ) {
        return n1Lit <= n2Lit;
      }
      return lteEvaluator;

      function lteEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        return lval <= rval;
      }
    }

    function createInEvaluator() {
      return n1Eval || n2Eval ? inEvaluator : inEvaluator();

      function inEvaluator(ctx, aliases, obj) {
        var rval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit;
        if ( Array.isArray(rval) ) {
          var item = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit;
          return rval.indexOf(item) !== -1;
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

    function createReEvaluator() {
      var regexCache = {};
      return n1Eval || n2Eval ? reEvaluator : reEvaluator();

      function reEvaluator(ctx, aliases, obj) {
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

    function createAsEvaluator() {
      return asEvaluator;

      function asEvaluator(ctx, aliases, obj) {
        var lval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit;
        aliases[n2Lit] = lval;
        return lval;
      }
    }

    function createTernEvaluator() {
      return n1Eval || n2Eval || n3Eval ? ternEvaluator : ternEvaluator();

      function ternEvaluator(ctx, aliases, obj) {
        var cval = n1Eval ? n1Eval(ctx, aliases, obj) : n1Lit
          , tval = n2Eval ? n2Eval(ctx, aliases, obj) : n2Lit
          , fval = n3Eval ? n3Eval(ctx, aliases, obj) : n3Lit;
        return cval ? tval : fval;
      }
    }
  }

  function createArrayTemplate(items) {
    var template = [];
    for ( var i = items.length; i--; ) {
      var item = items[i], isNode = Array.isArray(item) && item.isNode;
      template[i] = isNode ? createEvaluator(item) : item;
    }
    return template;
  }

  function createPathEvaluator(rootEvaluator, pathComponents) {
    var path = createArrayTemplate(pathComponents);
    return pathEvaluator;

    function pathEvaluator(ctx, aliases, obj) {
      var value = rootEvaluator(ctx, aliases, obj);
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
    }
  }

  function createArgPathEvaluator(index, pathComponents) {
    return createPathEvaluator(argPathRootEvaluator, pathComponents);

    function argPathRootEvaluator(ctx /* aliases, obj */) {
      return ctx.params[index];
    }
  }

  function createSymbolPathEvaluator(symbol, pathComponents) {
    return createPathEvaluator(symbolPathRootEvaluator, pathComponents);

    function symbolPathRootEvaluator(ctx, aliases, obj) {
      return aliases[symbol];
    }
  }

  function createLocalPathEvaluator(pathComponents) {
    return createPathEvaluator(localPathRootEvaluator, pathComponents);

    function localPathRootEvaluator(ctx, aliases, obj) {
      return obj;
    }
  }

  /* Step Processing *********************************************************/

  function wrapEvaluator(stepDefinition) {
    var result = createEvaluator(stepDefinition[1]);
    if ( typeof result !== 'function' ) {
      return evalWrapper;
    }
    return result;

    function evalWrapper() {
      return result;
    }
  }

  function createFilter(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition);
    return filter;

    function filter(ctx, arr) {
      var elem, i, idx, ilen, result
        , filtered = false;

      // Scan for the first excluded item, if any
      for ( i = 0, ilen = arr.length; i < ilen; i++ ) {
        elem = arr[i];
        if ( !evaluator(ctx, elem.aliases, elem.obj) ) {
          filtered = true;
          result = slice.call(arr, 0, i);
          break;
        }
      }

      if ( !filtered ) {
        // The array wasn't filtered, so we can just return it
        return arr;
      }

      // Continue generating the filtered result
      for ( idx = i, i++; i < ilen; i++ ) {
        elem = arr[i];
        if ( evaluator(ctx, elem.aliases, elem.obj) ) {
          result[idx++] = elem;
        }
      }
      return result;
    }
  }

  function createSelect(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition);
    return createSelectIterator(select);

    function select(ctx, aliases, obj) {
      return [evaluator(ctx, aliases, obj)];
    }
  }

  function createExpand(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition);
    return createSelectIterator(expand);

    function expand(ctx, aliases, obj) {
      var result = evaluator(ctx, aliases, obj);
      if ( Array.isArray(result) ) {
        return result;
      }
      else if ( result !== null && result !== undefined ) {
        return [result];
      }
      return [];
    }
  }

  function createContract(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition);
    return createSelectIterator(contract);

    function contract(ctx, aliases, obj) {
      var result = evaluator(ctx, aliases, obj);
      if ( Array.isArray(result) ) {
        if ( result.length ) {
          return [result[0]];
        }
      }
      else if ( result !== null && result !== undefined ) {
        return [result];
      }
      return [];
    }
  }

  function createSelectIterator(evaluator) {
    return selectIterator;

    function selectIterator(ctx, arr) {
      var result = [];

      for ( var i = 0, idx = 0, ilen = arr.length; i < ilen; i++ ) {
        var elem = arr[i]
          , aliases = elem.aliases
          , selectResult = evaluator(ctx, aliases, elem.obj);

        for ( var j = 0, jlen = selectResult.length; j < jlen; j++ ) {
          result[idx++] = { obj: selectResult[j], aliases: aliases };
        }
      }
      return result;
    }
  }

  function createSort(stepDefinition) {
    var order = stepDefinition[1]
      , getPaths = [];

    for ( var i = order.length; i--; ) {
      getPaths[i] = createLocalPathEvaluator(order[i].path.slice(1));
    }
    return sort;

    function sort(ctx, arr) {
      var comparators = [];
      for ( var i = order.length; i--; ) {
        comparators[i] = createComparator(getPaths[i], order[i].ascending);
      }
      arr.sort(sortFunction);
      return arr;

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
        return ascending ? ascendingComparator : descendingComparator;

        function ascendingComparator(item1, item2) {
          var val1 = getPath(ctx, item1)
            , val2 = getPath(ctx, item2);
          return val1 == val2 ? 0 : val1 > val2 ? 1 : -1;
        }

        function descendingComparator(item1, item2) {
          var val1 = getPath(ctx, item1)
            , val2 = getPath(ctx, item2);
          return val1 == val2 ? 0 : val1 < val2 ? 1 : -1;
        }
      }
    }
  }

  function createGroup(stepDefinition) {

  }

  function createAggregate(stepDefinition) {
    var aggregate = stepDefinition[1]
      , extensions = [];
    for ( var i = aggregate.length; i--; ) {
      extensions[i] = engine.getExtension(aggregate[i]);
    }
    return aggregator;

    function aggregator(ctx, arr) {
      var result = util.createObjectArray(arr);
      var args = [ctx, result];
      for ( var i = 0, ilen = extensions.length; i < ilen; i++ ) {
        args[1] = result = extensions[i].apply(arr, args);
      }
      if ( !Array.isArray(result) ) {
        if ( result === null || result === undefined ) {
          return [];
        }
        result = [result];
      }
      return util.createShadowedArray(result);
    }
  }
}

// Exports
exports.createCompiler = createCompiler;
