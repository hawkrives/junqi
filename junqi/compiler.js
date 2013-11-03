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

var GROUP_KEY = '__junqi_group_key__'
  , nextGroupKey = 0;

function isFunction(value) {
  return typeof value === 'function';
}

function isLiteral(value) {
  return typeof value !== 'function';
}

function createCompiler(engine) {
  return {
    compile: compile
  };

  function compile(parseTree) {
    return wrapEvaluator(createEvaluator(parseTree));
  }

  // Expression Evaluation ****************************************************

  function wrapEvaluator(node) {
    var result = createEvaluator(node);
    if ( typeof result !== 'function' ) {
      return evalWrapper;
    }
    return result;

    function evalWrapper() {
      return result;
    }
  }

  function createEvaluator(node) {
    if ( !Array.isArray(node) || !node.isNode ) {
      return node;
    }

    // Resolving Operators
    var op = node[0];

    switch ( op ) {
      case 'steps':
        return createStepsEvaluator(node);
      case 'path.arg':
        return createArgPathEvaluator(node);
      case 'path.local':
        return createLocalPathEvaluator(node);
      case 'path.symbol':
        return createSymbolPathEvaluator(node);
      case 'obj':
        return createObjEvaluator(node);
      case 'arr':
        return createArrEvaluator(node);
      case 'func':
        return createFuncEvaluator(node);
      case 'not':
        return createNotEvaluator(node);
      case 'neg':
        return createNegEvaluator(node);
      case 'and':
        return createAndEvaluator(node);
      case 'or':
        return createOrEvaluator(node);
      case 'add':
        return createAddEvaluator(node);
      case 'sub':
        return createSubEvaluator(node);
      case 'mul':
        return createMulEvaluator(node);
      case 'div':
        return createDivEvaluator(node);
      case 'mod':
        return createModEvaluator(node);
      case 'eq':
        return createEqEvaluator(node);
      case 'neq':
        return createNeqEvaluator(node);
      case 'gt':
        return createGtEvaluator(node);
      case 'gte':
        return createGteEvaluator(node);
      case 'lt':
        return createLtEvaluator(node);
      case 'lte':
        return createLteEvaluator(node);
      case 'in':
        return createInEvaluator(node);
      case 're':
        return createReEvaluator(node);
      case 'as':
        return createAsEvaluator(node);
      case 'tern':
        return createTernEvaluator(node);
      default:
        throw new Error("Invalid parser node: " + op);
    }
  }

  // Evaluator Generation ***************************************************

  function createObjectTemplate(hash) {
    var keys = Object.keys(hash)
      , template = {};

    for ( var i = keys.length; i--; ) {
      var key = keys[i];
      template[key] = createEvaluator(hash[key]);
    }
    Object.freeze(template);
    return template;
  }

  function createObjEvaluator(node) {
    var template = createObjectTemplate(node[1]);
    return objEvaluator;

    function objEvaluator(ctx, aliases, obj) {
      var keys = Object.keys(template)
        , result = {};

      for ( var i = keys.length; i--; ) {
        var key = keys[i]
          , item = template[key];
        result[key] = isLiteral(item) ? item : item(ctx, aliases, obj);
      }
      return result;
    }
  }

  function createArrEvaluator(node) {
    var template = createArrayTemplate(node[1]);
    return arrEvaluator;

    function arrEvaluator(ctx, aliases, obj) {
      var result = [];
      for ( var i = template.length; i--; ) {
        var item = template[i];
        result[i] = isLiteral(item) ? item : item(ctx, aliases, obj);
      }
      return result;
    }
  }

  function createFuncEvaluator(node) {
    var func = engine.getExtension(node[1])
      , template = createArrayTemplate(node[2]);
    return funcEvaluator;

    function funcEvaluator(ctx, aliases, obj) {
      var funcArgs = [];
      for ( var i = template.length; i--; ) {
        var item = template[i];
        funcArgs[i] = isLiteral(item) ? item : item(ctx, aliases, obj);
      }
      return func.apply(obj, [ctx].concat(funcArgs));
    }
  }

  function createNotEvaluator(node) {
    var $1 = createEvaluator(node[1]);
    if ( isLiteral($1) ) {
      return !$1;
    }
    return notEvaluator;

    function notEvaluator(ctx, aliases, obj) {
      return !$1(ctx, aliases, obj);
    }
  }

  function createNegEvaluator(node) {
    var $1 = createEvaluator(node[1]);
    if ( isLiteral($1) ) {
      return -$1;
    }
    return negEvaluator;

    function negEvaluator(ctx, aliases, obj) {
      return -$1(ctx, aliases, obj);
    }
  }

  function createAndEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 && $2;
    }
    return andEvaluator;

    function andEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj);
      if ( !lval ) {
        return lval;
      }
      return $2_lit ? $2 : $2(ctx, aliases, obj);
    }
  }

  function createOrEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 || $2;
    }
    return orEvaluator;

    function orEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj);
      if ( lval ) {
        return lval;
      }
      return $2_lit ? $2 : $2(ctx, aliases, obj);
    }
  }

  function createAddEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 + $2;
    }
    return addEvaluator;

    function addEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval + rval;
    }
  }

  function createSubEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);
    
    if ( $1_lit && $2_lit ) {
      return $1 - $2;
    }
    return subEvaluator;

    function subEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval - rval;
    }
  }

  function createMulEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);
    
    if ( $1_lit && $2_lit ) {
      return $1 * $2;
    }
    return mulEvaluator;

    function mulEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval * rval;
    }
  }

  function createDivEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);
    
    if ( $1_lit && $2_lit ) {
      return $1 / $2;
    }
    return divEvaluator;

    function divEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval / rval;
    }
  }

  function createModEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 % $2;
    }
    return modEvaluator;

    function modEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval % rval;
    }
  }

  function createEqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 == $2;
    }
    return eqEvaluator;

    function eqEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval == rval;
    }
  }

  function createNeqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 != $2;
    }
    return neqEvaluator;

    function neqEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval != rval;
    }
  }

  function createGtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 > $2;
    }
    return gtEvaluator;

    function gtEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval > rval;
    }
  }

  function createGteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 >= $2;
    }
    return gteEvaluator;

    function gteEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval >= rval;
    }
  }

  function createLtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 < $2;
    }
    return ltEvaluator;

    function ltEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval < rval;
    }
  }

  function createLteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1)
      , $2_lit = isLiteral($2);

    if ( $1_lit && $2_lit ) {
      return $1 <= $2;
    }
    return lteEvaluator;

    function lteEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj)
        , rval = $2_lit ? $2 : $2(ctx, aliases, obj);
      return lval <= rval;
    }
  }

  function createInEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = isFunction($1)
      , $2_func = isFunction($2);

    return $1_func || $2_func ? inEvaluator : inEvaluator();

    function inEvaluator(ctx, aliases, obj) {
      var rval = $2_func ? $2(ctx, aliases, obj) : $2;
      if ( Array.isArray(rval) ) {
        var item = $1_func ? $1(ctx, aliases, obj) : $1;
        return rval.indexOf(item) !== -1;
      }
      else if ( typeof rval === 'object' ) {
        return ($1_func ? $1(ctx, aliases, obj) : $1) in rval;
      }
      else if ( rval !== null && rval !== undefined ) {
        return ($1_func ? $1(ctx, aliases, obj) : $1) == rval;
      }
      return false;
    }
  }

  function createReEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = isFunction($1)
      , $2_func = isFunction($2);

    var regexCache = {};
    return $1_func || $2_func ? reEvaluator : reEvaluator();

    function reEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2
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

  function createAsEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_lit = isLiteral($1);

    return asEvaluator;

    function asEvaluator(ctx, aliases, obj) {
      var lval = $1_lit ? $1 : $1(ctx, aliases, obj);
      aliases[$2] = lval;
      return lval;
    }
  }

  function createTernEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $3 = createEvaluator(node[3])
      , $1_func = isFunction($1)
      , $2_func = isFunction($2)
      , $3_func = isFunction($3);
    
    return $1_func || $2_func || $3_func ? ternEvaluator : ternEvaluator();

    function ternEvaluator(ctx, aliases, obj) {
      var cval = $1_func ? $1(ctx, aliases, obj) : $1
        , tval = $2_func ? $2(ctx, aliases, obj) : $2
        , fval = $3_func ? $3(ctx, aliases, obj) : $3;
      return cval ? tval : fval;
    }
  }

  function createArrayTemplate(items) {
    var template = [];
    for ( var i = items.length; i--; ) {
      template[i] = createEvaluator(items[i]);
    }
    Object.freeze(template);
    return template;
  }

  function createPathEvaluator(rootEvaluator, pathComponents) {
    var path = createArrayTemplate(slice.call(pathComponents, 1));
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

  function createArgPathEvaluator(node) {
    var pathComponents = node[1]
      , index = pathComponents[0];
    return createPathEvaluator(argPathRootEvaluator, pathComponents);

    function argPathRootEvaluator(ctx /* aliases, obj */) {
      return ctx.params[index];
    }
  }

  function createSymbolPathEvaluator(node) {
    var pathComponents = node[1]
      , symbol = pathComponents[0];
    return createPathEvaluator(symbolPathRootEvaluator, pathComponents);

    function symbolPathRootEvaluator(ctx, aliases, obj) {
      return aliases[symbol];
    }
  }

  function createLocalPathEvaluator(node) {
    var pathComponents = node[1];
    return createPathEvaluator(localPathRootEvaluator, pathComponents);

    function localPathRootEvaluator(ctx, aliases, obj) {
      return obj;
    }
  }

  // Step Processing **********************************************************

  function createStepsEvaluator(node) {
    var pipeline = [querySetup]
      , stepDefinitions = node[1]
      , processGroups = false;

    for ( var i = 0, ilen = stepDefinitions.length; i < ilen; i++ ) {
      var stepDefinition = stepDefinitions[i]
        , stepType = stepDefinition[0]
        , evaluator = createStepEvaluator(stepDefinition);

      if ( processGroups ) {
        evaluator = createGroupEvaluator(evaluator);
      }

      if ( stepType === 'group' ) {
        processGroups = true;
      }

      pipeline.push(evaluator);
    }

    pipeline.push(processGroups ? queryGroupResults : querySetResults);
    Object.freeze(pipeline);
    
    return stepsEvaluator;

    function stepsEvaluator(ctx, aliases, data) {
      if ( !Array.isArray(data) ) {
        data = [data];
      }
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
  
  function createStepEvaluator(stepDefinition) {
    var stepType = stepDefinition[0];

    switch ( stepType ) {
      case 'filter':
        return createFilterStep(stepDefinition);

      case 'select':
        return createSelectStep(stepDefinition);

      case 'expand':
        return createExpandStep(stepDefinition);

      case 'sort':
        return createSortStep(stepDefinition);

      case 'group':
        return createGroupStep(stepDefinition);

      case 'aggregate':
        return createAggregateStep(stepDefinition);

      default:
        throw new Error("Invalid step type '" + stepType + "'");
    }
  }

  function createFilterStep(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition[1]);
    return filterStep;

    function filterStep(ctx, arr) {
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

  function createSelectStep(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition[1]);
    return createSelectIterator(selectStep);

    function selectStep(ctx, aliases, obj) {
      return [evaluator(ctx, aliases, obj)];
    }
  }

  function createExpandStep(stepDefinition) {
    var evaluator = wrapEvaluator(stepDefinition[1]);
    return createSelectIterator(expandStep);

    function expandStep(ctx, aliases, obj) {
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

  function createSortStep(stepDefinition) {
    var order = stepDefinition[1]
      , evaluators = [];

    for ( var i = order.length; i--; ) {
      evaluators[i] = wrapEvaluator(order[i].expr);
    }
    return sortStep;

    function sortStep(ctx, arr) {
      var ascending = [];
      for ( var i = order.length; i--; ) {
        ascending[i] = order[i].ascending;
      }
      arr.sort(sortFunction);
      return arr;

      function sortFunction(item1, item2) {
        var aliases1 = item1.aliases
          , aliases2 = item2.aliases
          , obj1 = item1.obj
          , obj2 = item2.obj;

        for ( var i = 0, ilen = evaluators.length; i < ilen; i++ ) {
          var val1 = evaluators[i](ctx, aliases1, obj1)
            , val2 = evaluators[i](ctx, aliases2, obj2)
            , result;

          if ( ascending[i] ) {
            result = ( val1 == val2 ? 0 : val1 > val2 ? 1 : -1 );
          }
          else {
            result = ( val1 == val2 ? 0 : val1 < val2 ? 1 : -1 );
          }

          if ( result !== 0 ) {
            return result;
          }
        }
        return 0;
      }
    }
  }

  function createGroupStep(stepDefinition) {
    var group = stepDefinition[1]
      , evaluators = [];

    for ( var i = group.length; i--; ) {
      evaluators[i] = wrapEvaluator(group[i]);
    }
    return groupStep;

    function groupStep(ctx, arr) {
      var result = {};

      for ( var i = 0, ilen = arr.length; i < ilen; i++ ) {
        var target = result
          , elem = arr[i]
          , obj = elem.obj
          , aliases = elem.aliases
          , evaluator, key;

        for ( var j = 0, jlen = evaluators.length; j < jlen; j++ ) {
          evaluator = evaluators[j];
          key = getGroupKey(evaluator(ctx, aliases, obj));
          // leaf nodes are arrays, branches are objects
          target = target[key] || (target[key] = ( j === jlen - 1 ? [] : {} ));
        }

        target.push(elem);
      }
      return result;
    }

    function getGroupKey(obj) {
      if ( typeof obj === 'object' ) {
        if ( !obj.hasOwnProperty(GROUP_KEY) ) {
          Object.defineProperty(obj, GROUP_KEY, {
            value: GROUP_KEY + nextGroupKey++
          });
        }
        return obj[GROUP_KEY];
      }
      return obj;
    }
  }

  // TODO: Result Can Still Carry Forward Group Keys
  function createAggregateStep(stepDefinition) {
    var aggregate = stepDefinition[1]
      , extensions = [];
    for ( var i = aggregate.length; i--; ) {
      extensions[i] = engine.getExtension(aggregate[i]);
    }
    return aggregateStep;

    function aggregateStep(ctx, arr) {
      var result = util.createObjectArray(arr)
        , args = [ctx, result];

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
