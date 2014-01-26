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
  , objectKeys = Object.keys
  , extendObject = util.extendObject;

// The nextGroupKey must be global since an Object may participate in
// multiple junqi environments.

var GROUP_KEY = '__junqi_group_key__'
  , nextGroupKey = 0;

function createCompiler(env) {
  "use strict";

  var getExtension = env.getExtension;

  var Steps = Object.freeze({
    filter:    createFilterStep,
    select:    createSelectStep,
    expand:    createExpandStep,
    extend:    createExtendStep,
    sort:      createSortStep,
    group:     createGroupStep,
    aggregate: createAggregateStep
  });

  var Evaluators = Object.freeze({
    steps:    createStepsEvaluator,
    block:    createBlockEvaluator,
    local:    createLocalPathEvaluator,
    param:    createParamPathEvaluator,
    obj:      createObjEvaluator,
    arr:      createArrEvaluator,
    subquery: createSubqueryEvaluator,
    call:     createCallEvaluator,
    merge:    createMergeEvaluator,
    not:      createNotEvaluator,
    neg:      createNegEvaluator,
    and:      createAndEvaluator,
    or:       createOrEvaluator,
    add:      createAddEvaluator,
    sub:      createSubEvaluator,
    mul:      createMulEvaluator,
    div:      createDivEvaluator,
    mod:      createModEvaluator,
    eq:       createEqEvaluator,
    neq:      createNeqEvaluator,
    gt:       createGtEvaluator,
    gte:      createGteEvaluator,
    lt:       createLtEvaluator,
    lte:      createLteEvaluator,
    in:       createInEvaluator,
    re:       createReEvaluator,
    assign:   createAssignEvaluator,
    tern:     createTernEvaluator
  });

  return Object.freeze({
    compile: compile
  });

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

    var nodeType = node[0]
      , createFunction = Evaluators[nodeType];

    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    return createFunction.apply(node, node.slice(1));
  }

  // Step Generation **********************************************************

  function createStepsEvaluator(stepDefinitions) {
    var pipeline = [createShadowedArray]
      , plen = pipeline.length
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
    var stepType = stepDefinition[0]
      , createFunction = Steps[stepType];

    if ( !createFunction ) {
      throw new Error("Invalid Step in Parse Tree: " + stepType);
    }

    return createFunction.apply(stepDefinition, stepDefinition.slice(1));
  }

  function createGroupEvaluator(evaluator) {
    return groupEvaluator;

    function groupEvaluator(data, ctx) {
      var keys = objectKeys(data);
      for ( var i = 0, ilen = keys.length; i < ilen; i++ ) {
        var key = keys[i]
          , subset = data[key];

        if ( isArray(subset) ) {
          data[key] = evaluator(subset, subset._ctx);
        }
        else {
          data[key] = groupEvaluator(subset, ctx);
        }
      }
      return data;
    }
  }

  function createFilterStep(filterNode) {
    var filter = wrapEvaluator(filterNode);
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

  function createSelectStep(selectedNodes) {
    var select;
    
    if ( selectedNodes.length > 1 ) {
      select = createArrEvaluator(selectedNodes);
    }
    else {
      select = wrapEvaluator(selectedNodes[0]);
    }
    return createSelectIterator(selectStep);

    function selectStep(obj, ctx) {
      return [select(obj, ctx)];
    }
  }

  function createExpandStep(expandedNode) {
    var expand = wrapEvaluator(expandedNode);
    
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

  function createExtendStep(extendedNodes) {
    var extend = createMergeEvaluator(extendedNodes);
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

  function createSortStep(orderingNodes) {
    var olen = orderingNodes.length
      , evaluators = [];
    
    for ( var i = olen; i--; ) {
      var orderComponent = orderingNodes[i]
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

  function createGroupStep(groupingNodes) {
    var groups = wrapEvaluatorArray(groupingNodes)
      , glen = groups.length;

    return groupStep;

    function groupStep(data, ctx) {
      var result = {};

      for ( var i = 0, ilen = data.length; i < ilen; i++ ) {
        var target = result
          , elem = data[i]
          , obj = elem.obj
          , elemCtx = elem.ctx
          , key
          , tmp;

        for ( var j = 0; j < glen; j++ ) {
          key = getGroupKey(groups[j](obj, elemCtx));
          tmp = target[key];

          if ( tmp ) {
            target = tmp;
            continue;
          }

          // leaf nodes are arrays, branches are objects
          if ( j === glen - 1 ) {
            target = target[key] = [];
            target._ctx = extendObject(extendContext(ctx), elemCtx);
            target._keys = objectKeys(elemCtx);
          }
          else {
            target = target[key] = {};
          }
        }

        // remove non-common parameters from group context
        var targetCtx = target._ctx
          , targetKeys = target._keys;
        for ( var k = targetKeys.length; k--; ) {
          key = targetKeys[k];
          if ( targetCtx[key] !== elemCtx[key] ) {
            targetKeys.splice(k, 1);
            delete targetCtx[key];
          }
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

  function createAggregateStep(extensionNames) {
    var alen = extensionNames.length
      , extensions = [];
    
    for ( var i = alen; i--; ) {
      extensions[i] = getExtension(extensionNames[i]);
    }
    return aggregateStep;

    function aggregateStep(data, ctx) {
      var result = createObjectArray(data);

      for ( var i = 0; i < alen; i++ ) {
        result = extensions[i].call(data, result);
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

  function createObjEvaluator(objectSkeleton) {
    var template = createObjectTemplate(objectSkeleton)
      , keys = objectKeys(template).reverse()
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

  function createArrEvaluator(arraySkeleton) {
    var template = wrapEvaluatorArray(arraySkeleton)
      , tlen = template.length;

    return arrEvaluator;

    function arrEvaluator(obj, ctx) {
      var result = [];
      for ( var i = 0; i < tlen; i++ ) {
        result[i] = template[i](obj, ctx);
      }
      return result;
    }
  }

  function createBlockEvaluator(blockNodes) {
    var block = wrapEvaluatorArray(blockNodes).reverse()
      , blen = block.length;

    return blockEvaluator;

    function blockEvaluator(obj, ctx) {
      var result = null;
      for ( var i = blen; i--; ) {
        result = block[i](obj, ctx);
      }
      return result;
    }

  }

  function createSubqueryEvaluator(inputNode, queryNode) {
    var input = wrapEvaluator(inputNode)
      , query = createEvaluator(queryNode);

    return subqueryEvaluator;

    function subqueryEvaluator(obj, ctx) {
      var data = input(obj, ctx)
        , subqueryCtx = extendContext(ctx);
      subqueryCtx.data = data;
      return query(data, subqueryCtx);
    }
  }

  function createCallEvaluator(funcName, argNodes) {
    var func = getExtension(funcName)
      , template = wrapEvaluatorArray(argNodes)
      , tlen = template.length;

    return callEvaluator;

    function callEvaluator(obj, ctx) {
      var funcArgs = [];
      for ( var i = 0; i < tlen; i++ ) {
        funcArgs[i] = template[i](obj, ctx);
      }
      return func.apply(obj, funcArgs);
    }
  }

  function createMergeEvaluator(mergedNodes) {
    var template = wrapEvaluatorArray(mergedNodes)
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
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? notEvaluator : !$1;

    function notEvaluator(obj, ctx) {
      return !$1(obj, ctx);
    }
  }

  function createNegEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(obj, ctx) {
      return -$1(obj, ctx);
    }
  }

  function createAndEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
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

  function createOrEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
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

  function createAddEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? addEvaluator : addEvaluator();

    function addEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval + rval;
    }
  }

  function createSubEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? subEvaluator : subEvaluator();

    function subEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval - rval;
    }
  }

  function createMulEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? mulEvaluator : mulEvaluator();

    function mulEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval * rval;
    }
  }

  function createDivEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? divEvaluator : divEvaluator();

    function divEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval / rval;
    }
  }

  function createModEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? modEvaluator : modEvaluator();

    function modEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval % rval;
    }
  }

  function createEqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? eqEvaluator : eqEvaluator();

    function eqEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval == rval;
    }
  }

  function createNeqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? neqEvaluator : neqEvaluator();

    function neqEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval != rval;
    }
  }

  function createGtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gtEvaluator : gtEvaluator();

    function gtEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval > rval;
    }
  }

  function createGteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gteEvaluator : gteEvaluator();

    function gteEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval >= rval;
    }
  }

  function createLtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? ltEvaluator : ltEvaluator();

    function ltEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval < rval;
    }
  }

  function createLteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? lteEvaluator : lteEvaluator();

    function lteEvaluator(obj, ctx) {
      var lval = $1_func ? $1(obj, ctx) : $1
        , rval = $2_func ? $2(obj, ctx) : $2;
      return lval <= rval;
    }
  }

  function createInEvaluator(elemNode, setNode) {
    var $1 = createEvaluator(elemNode)
      , $2 = createEvaluator(setNode)
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

  function createReEvaluator(regexNode, testNode) {
    var $1 = createEvaluator(regexNode)
      , $2 = createEvaluator(testNode)
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

  function createAssignEvaluator(paramName, exprNode) {
    var $1 = createEvaluator(paramName)
      , $2 = createEvaluator(exprNode)
      , $2_func = typeof $2 === 'function';

    return asEvaluator;

    function asEvaluator(obj, ctx) {
      var lval = $2_func ? $2(obj, ctx) : $2;
      ctx[$1] = lval;
      return lval;
    }
  }

  function createTernEvaluator(conditionNode, trueNode, falseNode) {
    var $1 = createEvaluator(conditionNode)
      , $2 = createEvaluator(trueNode)
      , $3 = createEvaluator(falseNode)
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
    var path = wrapEvaluatorArray(pathComponents || [])
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

  function createLocalPathEvaluator(pathComponents) {
    return createPathEvaluator(localPathRootEvaluator, pathComponents);

    function localPathRootEvaluator(obj /* , ctx */) {
      return obj;
    }
  }

  function createParamPathEvaluator(param, pathComponents) {
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
