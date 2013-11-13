/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var util = require('./util');

var slice = Array.prototype.slice
  , isArray = Array.isArray
  , defineProperties = Object.defineProperty
  , extendContext = Object.create
  , objectKeys = Object.keys;

// The nextGroupKey must be global since an Object may participate in
// multiple junqi environments.

var GROUP_KEY = '__junqi_group_key__'
  , nextGroupKey = 0;

function createCompiler(env) {
  "use strict";

  var getExtension = env.getExtension;
  
  var compiler = {
    compile: compile
  };
  
  util.freezeObjects(compiler);
  return compiler;

  // Implementation ***********************************************************
  
  function compile(parseTree) {
    return wrapEvaluator(parseTree);
  }

  function wrapEvaluatorArray(arr) {
    var result = [];
    for ( var i = arr.length; i--; ) {
      result[i] = wrapEvaluator(arr[i]);
    }
    return result;
  }
  
  function wrapEvaluator(node) {
    var result = createEvaluator(node);
    if ( typeof result === 'function' ) {
      return result;
    }
    return evalWrapper;

    function evalWrapper() {
      return result;
    }
  }

  function createEvaluator(node) {
    if ( !isArray(node) || !node.isNode ) {
      return node;
    }

    // Resolving Operators
    var op = node[0];

    switch ( op ) {
      case 'steps':
        return createStepsEvaluator(node);
      case 'local':
        return createLocalPathEvaluator(node);
      case 'param':
        return createParamPathEvaluator(node);
      case 'obj':
        return createObjEvaluator(node);
      case 'arr':
        return createArrEvaluator(node);
      case 'subquery':
        return createSubqueryEvaluator(node);
      case 'func':
        return createFuncEvaluator(node);
      case 'merge':
        return createMergeEvaluator(node);
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
        throw new Error("Invalid Node in Parse Tree: " + op);
    }
  }

  // Step Generation **********************************************************

  function createStepsEvaluator(node) {
    var pipeline = [createShadowedArray]
      , plen = pipeline.length
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

      pipeline[plen++] = evaluator;
    }

    pipeline[plen++] = processGroups ? queryGroupResults : createObjectArray;
    return stepsEvaluator;

    function stepsEvaluator(data, ctx) {
      if ( !isArray(data) ) {
        data = [data];
      }
      for ( var i = 0; i < plen; i++ ) {
        data = pipeline[i](data, ctx);
      }
      return data;
    }

    function queryGroupResults(data /* , ctx */) {
      return processObject(data, []);

      function processObject(obj, result) {
        var keys = objectKeys(obj);
        for ( var i = 0, ilen = keys.length; i < ilen; i++ ) {
          var value = obj[keys[i]];
          if ( isArray(value) ) {
            result = result.concat(createObjectArray(value));
          }
          else {
            result = processObject(value, result);
          }
        }
        return result;
      }
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
      case 'extend':
        return createExtendStep(stepDefinition);
      case 'sort':
        return createSortStep(stepDefinition);
      case 'group':
        return createGroupStep(stepDefinition);
      case 'aggregate':
        return createAggregateStep(stepDefinition);
      default:
        throw new Error("Invalid Step in Parse Tree: " + stepType);
    }
  }

  function createGroupEvaluator(evaluator) {
    return groupEvaluator;

    function groupEvaluator(data, ctx) {
      var keys = objectKeys(data);
      for ( var i = 0, ilen = keys.length; i < ilen; i++ ) {
        var key = keys[i]
          , subset = data[key];

        if ( isArray(subset) ) {
          data[key] = evaluator(subset, ctx);
        }
        else {
          data[key] = groupEvaluator(subset, ctx);
        }
      }
      return data;
    }
  }

  function createFilterStep(stepDefinition) {
    var filter = wrapEvaluator(stepDefinition[1]);
    return filterStep;

    function filterStep(data /* , ctx */) {
      var elem, i, idx, ilen, result
        , filtered = false;

      // Scan for the first excluded item, if any
      for ( i = 0, ilen = data.length; i < ilen; i++ ) {
        elem = data[i];
        if ( !filter(elem.obj, elem.ctx) ) {
          filtered = true;
          result = slice.call(data, 0, i);
          break;
        }
      }

      if ( !filtered ) {
        // The array wasn't filtered, so we can just return it
        return data;
      }

      // Continue generating the filtered result
      for ( idx = i, i++; i < ilen; i++ ) {
        elem = data[i];
        if ( filter(elem.obj, elem.ctx) ) {
          result[idx++] = elem;
        }
      }
      return result;
    }
  }

  function createSelectStep(stepDefinition) {
    var evaluators = stepDefinition[1]
      , select;
    
    if ( evaluators.length > 1 ) {
      select = createArrEvaluator(stepDefinition);
    }
    else {
      select = wrapEvaluator(evaluators[0]);
    }
    return createSelectIterator(selectStep);

    function selectStep(obj, ctx) {
      return [select(obj, ctx)];
    }
  }

  function createExpandStep(stepDefinition) {
    var expand = wrapEvaluator(stepDefinition[1]);
    
    return createSelectIterator(expandStep);

    function expandStep(obj, ctx) {
      var result = expand(obj, ctx);
      if ( isArray(result) ) {
        return result;
      }
      else if ( result !== null && result !== undefined ) {
        return [result];
      }
      return [];
    }
  }

  function createExtendStep(stepDefinition) {
    var extend = createMergeEvaluator(stepDefinition);
    return createSelectIterator(extendStep);

    function extendStep(obj, ctx) {
      return [extend(obj, ctx)];
    }
  }

  function createSelectIterator(evaluator) {
    return selectIterator;

    function selectIterator(data /* , ctx */) {
      var result = [];

      for ( var i = 0, idx = 0, ilen = data.length; i < ilen; i++ ) {
        var elem = data[i]
          , elemCtx = elem.ctx
          , selectResult = evaluator(elem.obj, elemCtx);

        for ( var j = 0, jlen = selectResult.length; j < jlen; j++ ) {
          result[idx++] = {
            obj: selectResult[j],
            ctx: extendContext(elemCtx)
          };
        }
      }
      return result;
    }
  }

  function createSortStep(stepDefinition) {
    var order = stepDefinition[1]
      , olen = order.length
      , evaluators = [];
    
    for ( var i = olen; i--; ) {
      var orderComponent = order[i]
        , evaluator = evaluators[i] = wrapEvaluator(orderComponent.expr);
      evaluator.ascending = orderComponent.ascending;
    }
    return sortStep;

    function sortStep(data /* , ctx */) {
      data.sort(sortFunction);
      return data;

      function sortFunction(item1, item2) {
        var obj1 = item1.obj
          , obj2 = item2.obj
          , ctx1 = item1.ctx
          , ctx2 = item2.ctx;

        for ( var i = 0; i < olen; i++ ) {
          var evaluator = evaluators[i]
            , val1 = evaluator(obj1, ctx1)
            , val2 = evaluator(obj2, ctx2)
            , result;

          if ( evaluator.ascending ) {
            result = val1 == val2 ? 0 : val1 > val2 ? 1 : -1;
          }
          else {
            result = val1 == val2 ? 0 : val1 < val2 ? 1 : -1;
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
    var groups = wrapEvaluatorArray(stepDefinition[1])
      , glen = groups.length;

    return groupStep;

    function groupStep(data /* , ctx */) {
      var result = {};

      for ( var i = 0, ilen = data.length; i < ilen; i++ ) {
        var target = result
          , elem = data[i]
          , obj = elem.obj
          , elemCtx = elem.ctx;

        for ( var j = 0; j < glen; j++ ) {
          var key = getGroupKey(groups[j](obj, elemCtx));
          
          // leaf nodes are arrays, branches are objects
          target = target[key] || (target[key] = ( j === glen - 1 ? [] : {} ));
        }

        target.push(elem);
      }
      return result;
    }

    function getGroupKey(obj) {
      if ( typeof obj === 'object' ) {
        if ( !obj.hasOwnProperty(GROUP_KEY) ) {
          defineProperties(obj, GROUP_KEY, {
            value: GROUP_KEY + nextGroupKey++
          });
        }
        return obj[GROUP_KEY];
      }
      return obj;
    }
  }

  // TODO: Result can still carry forward group keys
  function createAggregateStep(stepDefinition) {
    var aggregate = stepDefinition[1]
      , alen = aggregate.length
      , extensions = [];
    
    for ( var i = alen; i--; ) {
      extensions[i] = getExtension(aggregate[i]);
    }
    return aggregateStep;

    function aggregateStep(data, ctx) {
      var result = createObjectArray(data)
        , args = [result];

      for ( var i = 0; i < alen; i++ ) {
        args[0] = result = extensions[i].apply(data, args);
      }
      
      if ( !isArray(result) ) {
        if ( result === null || result === undefined ) {
          return [];
        }
        result = [result];
      }
      
      return createShadowedArray(result, ctx);
    }
  }

  // Evaluator Generation ***************************************************

  function createObjectTemplate(hash) {
    var keys = objectKeys(hash)
      , template = {};

    for ( var i = keys.length; i--; ) {
      var key = keys[i];
      template[key] = wrapEvaluator(hash[key]);
    }
    
    return template;
  }

  function createObjEvaluator(node) {
    var template = createObjectTemplate(node[1])
      , keys = objectKeys(template)
      , klen = keys.length;

    return objEvaluator;

    function objEvaluator(obj, ctx) {
      var result = {};

      for ( var i = klen; i--; ) {
        var key = keys[i];
        result[key] = template[key](obj, ctx);
      }
      return result;
    }
  }

  function createArrEvaluator(node) {
    var template = wrapEvaluatorArray(node[1])
      , tlen = template.length;

    return arrEvaluator;

    function arrEvaluator(obj, ctx) {
      var result = [];
      for ( var i = tlen; i--; ) {
        result[i] = template[i](obj, ctx);
      }
      return result;
    }
  }

  function createSubqueryEvaluator(node) {
    var input = wrapEvaluator(node[1])
      , steps = createEvaluator(node[2]);

    return subqueryEvaluator;

    function subqueryEvaluator(obj, ctx) {
      var data = input(obj, ctx)
        , subqueryCtx = extendContext(ctx);
      subqueryCtx.data = data;
      return steps(data, subqueryCtx);
    }
  }

  function createFuncEvaluator(node) {
    var func = getExtension(node[1])
      , template = wrapEvaluatorArray(node[2])
      , tlen = template.length;

    return funcEvaluator;

    function funcEvaluator(obj, ctx) {
      var funcArgs = [];
      for ( var i = tlen; i--; ) {
        funcArgs[i] = template[i](obj, ctx);
      }
      return func.apply(obj, funcArgs);
    }
  }

  function createMergeEvaluator(node) {
    var template = wrapEvaluatorArray(node[1])
      , tlen = template.length;

    return mergeEvaluator;

    function mergeEvaluator(obj, ctx) {
      var result = {}; // We don't mutate the first item

      for ( var i = 0; i < tlen; i++ ) {
        var elem = template[i](obj, ctx)
          , keys = objectKeys(elem);

        for ( var j = 0, jlen = keys.length; j < jlen; j++ ) {
          var key = keys[j];
          result[key] = elem[key];
        }
      }
      
      return result;
    }
  }
  
  function createNotEvaluator(node) {
    var $1 = createEvaluator(node[1]);
    return typeof $1 === 'function' ? notEvaluator : !$1;

    function notEvaluator(obj, ctx) {
      return !$1(obj, ctx);
    }
  }

  function createNegEvaluator(node) {
    var $1 = createEvaluator(node[1]);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(obj, ctx) {
      return -$1(obj, ctx);
    }
  }

  function createAndEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? andEvaluator : andEvaluator();

    function andEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1;
      if ( !lval ) {
        return lval;
      }
      return $2_func ? $2(obj, ctx) : $2;
    }
  }

  function createOrEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? orEvaluator : orEvaluator();

    function orEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1;
      if ( lval ) {
        return lval;
      }
      return $2_func ? $2(obj, ctx) : $2;
    }
  }

  function createAddEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? addEvaluator : addEvaluator();

    function addEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval + rval;
    }
  }

  function createSubEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? subEvaluator : subEvaluator();

    function subEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval - rval;
    }
  }

  function createMulEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? mulEvaluator : mulEvaluator();

    function mulEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval * rval;
    }
  }

  function createDivEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? divEvaluator : divEvaluator();

    function divEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval / rval;
    }
  }

  function createModEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? modEvaluator : modEvaluator();

    function modEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval % rval;
    }
  }

  function createEqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? eqEvaluator : eqEvaluator();

    function eqEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval == rval;
    }
  }

  function createNeqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? neqEvaluator : neqEvaluator();

    function neqEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval != rval;
    }
  }

  function createGtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gtEvaluator : gtEvaluator();

    function gtEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval > rval;
    }
  }

  function createGteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gteEvaluator : gteEvaluator();

    function gteEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval >= rval;
    }
  }

  function createLtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? ltEvaluator : ltEvaluator();

    function ltEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval < rval;
    }
  }

  function createLteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? lteEvaluator : lteEvaluator();

    function lteEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval <= rval;
    }
  }

  function createInEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? inEvaluator : inEvaluator();

    function inEvaluator(obj, ctx) {
      var rval = $2_func ? $2(obj, ctx) : $2;
      if ( isArray(rval) ) {
        var item = $1_func ? $1(obj, ctx) : $1;
        return rval.indexOf(item) !== -1;
      }
      else if ( typeof rval === 'object' ) {
        return ( $1_func ? $1(obj, ctx) : $1 ) in rval;
      }
      else if ( rval !== null && rval !== undefined ) {
        return ( $1_func ? $1(obj, ctx) : $1 ) == rval;
      }
      return false;
    }
  }

  function createReEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    var regexCache = {};
    return $1_func || $2_func ? reEvaluator : reEvaluator();

    function reEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2
        , re, key;

      if ( typeof lval !== 'string' && !isArray(lval) ) {
        return false;
      }

      if ( typeof lval === 'string' ) {
        lval = [lval];
        key = lval;
      }
      else {
        key = lval.join('/');
      }

      re = regexCache[key] || (regexCache[key] = RegExp.apply(null, lval));
      return re.test(rval);
    }
  }

  function createAsEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function';

    return asEvaluator;

    function asEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1;
      ctx[$2] = lval;
      return lval;
    }
  }

  function createTernEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $3 = createEvaluator(node[3])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function'
      , $3_func = typeof $3 === 'function';
    
    return $1_func || $2_func || $3_func ? ternEvaluator : ternEvaluator();

    function ternEvaluator(obj, ctx) {
      var cval = $1_func ? $1(obj, ctx) : $1;
      if ( cval ) {
        return $2_func ? $2(obj, ctx) : $2;
      }
      return $3_func ? $3(obj, ctx) : $3;
    }
  }

  function createPathEvaluator(rootEvaluator, pathComponents) {
    var path = wrapEvaluatorArray(slice.call(pathComponents, 1))
      , plen = path.length;

    return pathEvaluator;

    function pathEvaluator(obj, ctx) {
      var value = rootEvaluator(obj, ctx);
      for ( var i = 0; i < plen; i++ ) {
        if ( value === null || value === undefined ) {
          return value;
        }

        var key = path[i](obj, ctx);
        value = value[key];
      }
      return value;
    }
  }

  function createLocalPathEvaluator(node) {
    var pathComponents = node[1];

    return createPathEvaluator(localPathRootEvaluator, pathComponents);

    function localPathRootEvaluator(obj /* , ctx */) {
      return obj;
    }
  }

  function createParamPathEvaluator(node) {
    var pathComponents = node[1]
      , param = pathComponents[0];

    return createPathEvaluator(paramPathRootEvaluator, pathComponents);

    function paramPathRootEvaluator(obj, ctx) {
      return ctx[param];
    }
  }

  // Utility Functions ********************************************************
  
  function createShadowedArray(array, ctx) {
    var result = []
      , i;

    if ( ctx ) {
      // Inheriting Parameters
      for ( i = array.length; i--; ) {
        result[i] = { obj: array[i], ctx: extendContext(ctx) };
      }
    }
    else {
      for ( i = array.length; i--; ) {
        result[i] = { obj: array[i], ctx: {} };
      }
    }
    return result;
  }

  function createObjectArray(array) {
    var result = [];
    for ( var i = array.length; i--; ) {
      result[i] = array[i].obj;
    }
    return result;
  }
}

// Exports
exports.createCompiler = createCompiler;
