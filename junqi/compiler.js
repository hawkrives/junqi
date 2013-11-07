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

function createCompiler(env) {
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
    if ( !Array.isArray(node) || !node.isNode ) {
      return node;
    }

    // Resolving Operators
    var op = node[0];

    switch ( op ) {
      case 'steps':
        return createStepsEvaluator(node);
      case 'argpath':
        return createArgPathEvaluator(node);
      case 'locpath':
        return createLocalPathEvaluator(node);
      case 'sympath':
        return createSymbolPathEvaluator(node);
      case 'obj':
        return createObjEvaluator(node);
      case 'arr':
        return createArrEvaluator(node);
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
    var pipeline = [querySetup]
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

    pipeline[plen++] = processGroups ? queryGroupResults : querySetResults;
    return stepsEvaluator;

    function stepsEvaluator(data, params) {
      if ( !Array.isArray(data) ) {
        data = [data];
      }
      for ( var i = 0; i < plen; i++ ) {
        data = pipeline[i](data, params);
      }
      return data;
    }

    function querySetup(data, params) {
      return util.createShadowedArray(data, params);
    }

    function queryGroupResults(data /* , params */) {
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

    function querySetResults(data /* , params */) {
      return util.createObjectArray(data);
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

    function groupEvaluator(data, params) {
      var keys = Object.keys(data);
      for ( var i = 0, ilen = keys.length; i < ilen; i++ ) {
        var key = keys[i]
          , subset = data[key];

        if ( Array.isArray(subset) ) {
          data[key] = evaluator(subset, params);
        }
        else {
          data[key] = groupEvaluator(subset, params);
        }
      }
      return data;
    }
  }

  function createFilterStep(stepDefinition) {
    var filter = wrapEvaluator(stepDefinition[1]);
    return filterStep;

    function filterStep(data /* , params */) {
      var elem, i, idx, ilen, result
        , filtered = false;

      // Scan for the first excluded item, if any
      for ( i = 0, ilen = data.length; i < ilen; i++ ) {
        elem = data[i];
        if ( !filter(elem.obj, elem.params) ) {
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
        if ( filter(elem.obj, elem.params) ) {
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

    function selectStep(obj, params) {
      return [select(obj, params)];
    }
  }

  function createExpandStep(stepDefinition) {
    var expand = wrapEvaluator(stepDefinition[1]);
    
    return createSelectIterator(expandStep);

    function expandStep(obj, params) {
      var result = expand(obj, params);
      if ( Array.isArray(result) ) {
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

    function extendStep(obj, params) {
      return [extend(obj, params)];
    }
  }

  function createSelectIterator(evaluator) {
    return selectIterator;

    function selectIterator(data /* , params */) {
      var result = [];

      for ( var i = 0, idx = 0, ilen = data.length; i < ilen; i++ ) {
        var elem = data[i]
          , elemParams = elem.params
          , selectResult = evaluator(elem.obj, elemParams);

        for ( var j = 0, jlen = selectResult.length; j < jlen; j++ ) {
          result[idx++] = { obj: selectResult[j], params: elemParams };
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

    function sortStep(data /* , params */) {
      data.sort(sortFunction);
      return data;

      function sortFunction(item1, item2) {
        var obj1 = item1.obj
          , obj2 = item2.obj
          , params1 = item1.params
          , params2 = item2.params

        for ( var i = 0; i < olen; i++ ) {
          var evaluator = evaluators[i]
            , val1 = evaluator(obj1, params1)
            , val2 = evaluator(obj2, params2)
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

    function groupStep(data /* , params */) {
      var result = {};

      for ( var i = 0, ilen = data.length; i < ilen; i++ ) {
        var target = result
          , elem = data[i]
          , obj = elem.obj
          , elemParams = elem.params;

        for ( var j = 0; j < glen; j++ ) {
          var key = getGroupKey(groups[j](obj, elemParams));
          
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
      , alen = aggregate.length
      , extensions = [];
    
    for ( var i = alen; i--; ) {
      extensions[i] = getExtension(aggregate[i]);
    }
    return aggregateStep;

    function aggregateStep(data, params) {
      var result = util.createObjectArray(data)
        , args = [result];

      for ( var i = 0; i < alen; i++ ) {
        args[0] = result = extensions[i].apply(data, args);
      }
      
      if ( !Array.isArray(result) ) {
        if ( result === null || result === undefined ) {
          return [];
        }
        result = [result];
      }
      
      return util.createShadowedArray(result, params);
    }
  }

  // Evaluator Generation ***************************************************

  function createObjectTemplate(hash) {
    var keys = Object.keys(hash)
      , template = {};

    for ( var i = keys.length; i--; ) {
      var key = keys[i];
      template[key] = wrapEvaluator(hash[key]);
    }
    
    return template;
  }

  function createObjEvaluator(node) {
    var template = createObjectTemplate(node[1])
      , keys = Object.keys(template)
      , klen = keys.length;

    return objEvaluator;

    function objEvaluator(obj, params) {
      var result = {};

      for ( var i = klen; i--; ) {
        var key = keys[i];
        result[key] = template[key](obj, params);
      }
      return result;
    }
  }

  function createArrEvaluator(node) {
    var template = wrapEvaluatorArray(node[1])
      , tlen = template.length;

    return arrEvaluator;

    function arrEvaluator(obj, params) {
      var result = [];
      for ( var i = tlen; i--; ) {
        result[i] = template[i](obj, params);
      }
      return result;
    }
  }

  function createFuncEvaluator(node) {
    var func = getExtension(node[1])
      , template = wrapEvaluatorArray(node[2])
      , tlen = template.length;

    return funcEvaluator;

    function funcEvaluator(obj, params) {
      var funcArgs = [];
      for ( var i = tlen; i--; ) {
        funcArgs[i] = template[i](obj, params);
      }
      return func.apply(obj, funcArgs);
    }
  }

  function createMergeEvaluator(node) {
    var template = wrapEvaluatorArray(node[1])
      , tlen = template.length;

    return mergeEvaluator;

    function mergeEvaluator(obj, params) {
      var result = {}; // We don't mutate the first item

      for ( var i = 0; i < tlen; i++ ) {
        var elem = template[i](obj, params)
          , keys = Object.keys(elem);

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

    function notEvaluator(obj, params) {
      return !$1(obj, params);
    }
  }

  function createNegEvaluator(node) {
    var $1 = createEvaluator(node[1]);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(obj, params) {
      return -$1(obj, params);
    }
  }

  function createAndEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? andEvaluator : andEvaluator();

    function andEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1;
      if ( !lval ) {
        return lval;
      }
      return $2_func ? $2(obj, params) : $2;
    }
  }

  function createOrEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? orEvaluator : orEvaluator();

    function orEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1;
      if ( lval ) {
        return lval;
      }
      return $2_func ? $2(obj, params) : $2;
    }
  }

  function createAddEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? addEvaluator : addEvaluator();

    function addEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval + rval;
    }
  }

  function createSubEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? subEvaluator : subEvaluator();

    function subEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval - rval;
    }
  }

  function createMulEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? mulEvaluator : mulEvaluator();

    function mulEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval * rval;
    }
  }

  function createDivEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? divEvaluator : divEvaluator();

    function divEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval / rval;
    }
  }

  function createModEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? modEvaluator : modEvaluator();

    function modEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval % rval;
    }
  }

  function createEqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? eqEvaluator : eqEvaluator();

    function eqEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval == rval;
    }
  }

  function createNeqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? neqEvaluator : neqEvaluator();

    function neqEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval != rval;
    }
  }

  function createGtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gtEvaluator : gtEvaluator();

    function gtEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval > rval;
    }
  }

  function createGteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gteEvaluator : gteEvaluator();

    function gteEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval >= rval;
    }
  }

  function createLtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? ltEvaluator : ltEvaluator();

    function ltEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval < rval;
    }
  }

  function createLteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? lteEvaluator : lteEvaluator();

    function lteEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2;
      return lval <= rval;
    }
  }

  function createInEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? inEvaluator : inEvaluator();

    function inEvaluator(obj, params) {
      var rval = $2_func ? $2(obj, params) : $2;
      if ( Array.isArray(rval) ) {
        var item = $1_func ? $1(obj, params) : $1;
        return rval.indexOf(item) !== -1;
      }
      else if ( typeof rval === 'object' ) {
        return ( $1_func ? $1(obj, params) : $1 ) in rval;
      }
      else if ( rval !== null && rval !== undefined ) {
        return ( $1_func ? $1(obj, params) : $1 ) == rval;
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

    function reEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1
        , rval = $2_func ? $2(obj, params) : $2
        , re, key;

      if ( typeof lval !== 'string' && !Array.isArray(lval) ) {
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

    function asEvaluator(obj, params) {
      var lval = $1_func ? $1(obj, params) : $1;
      params[$2] = lval;
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

    function ternEvaluator(obj, params) {
      var cval = $1_func ? $1(obj, params) : $1;
      if ( cval ) {
        return $2_func ? $2(obj, params) : $2;
      }
      return $3_func ? $3(obj, params) : $3;
    }
  }

  function createPathEvaluator(rootEvaluator, pathComponents) {
    var path = wrapEvaluatorArray(slice.call(pathComponents, 1))
      , plen = path.length;

    return pathEvaluator;

    function pathEvaluator(obj, params) {
      var value = rootEvaluator(obj, params);
      for ( var i = 0; i < plen; i++ ) {
        if ( value === null || value === undefined ) {
          return value;
        }

        var key = path[i](obj, params);
        value = value[key];
      }
      return value;
    }
  }

  function createArgPathEvaluator(node) {
    var pathComponents = node[1]
      , index = pathComponents[0];

    return createPathEvaluator(argPathRootEvaluator, pathComponents);

    function argPathRootEvaluator(obj, params) {
      return params[index];
    }
  }

  function createSymbolPathEvaluator(node) {
    var pathComponents = node[1]
      , symbol = pathComponents[0];

    return createPathEvaluator(symbolPathRootEvaluator, pathComponents);

    function symbolPathRootEvaluator(obj, params) {
      return params[symbol];
    }
  }

  function createLocalPathEvaluator(node) {
    var pathComponents = node[1];

    return createPathEvaluator(localPathRootEvaluator, pathComponents);

    function localPathRootEvaluator(obj, params) {
      return obj;
    }
  }
}

// Exports
exports.createCompiler = createCompiler;
