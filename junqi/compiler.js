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

    function stepsEvaluator(ctx, aliases, data) {
      if ( !Array.isArray(data) ) {
        data = [data];
      }
      for ( var i = 0; i < plen; i++ ) {
        var f = pipeline[i];
        data = f(ctx, data);
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

  function createFilterStep(stepDefinition) {
    var filter = wrapEvaluator(stepDefinition[1]);
    return filterStep;

    function filterStep(ctx, arr) {
      var elem, i, idx, ilen, result
        , filtered = false;

      // Scan for the first excluded item, if any
      for ( i = 0, ilen = arr.length; i < ilen; i++ ) {
        elem = arr[i];
        if ( !filter(ctx, elem.aliases, elem.obj) ) {
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
        if ( filter(ctx, elem.aliases, elem.obj) ) {
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

    function selectStep(ctx, aliases, obj) {
      return [select(ctx, aliases, obj)];
    }
  }

  function createExpandStep(stepDefinition) {
    var expand = wrapEvaluator(stepDefinition[1]);
    
    return createSelectIterator(expandStep);

    function expandStep(ctx, aliases, obj) {
      var result = expand(ctx, aliases, obj);
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

    function extendStep(ctx, aliases, obj) {
      return [extend(ctx, aliases, obj)];
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
      , olen = order.length
      , evaluators = [];
    
    for ( var i = olen; i--; ) {
      var orderComponent = order[i]
        , evaluator = evaluators[i] = wrapEvaluator(orderComponent.expr);
      evaluator.ascending = orderComponent.ascending;
    }
    return sortStep;

    function sortStep(ctx, arr) {
      arr.sort(sortFunction);
      return arr;

      function sortFunction(item1, item2) {
        var aliases1 = item1.aliases
          , aliases2 = item2.aliases
          , obj1 = item1.obj
          , obj2 = item2.obj;

        for ( var i = 0; i < olen; i++ ) {
          var evaluator = evaluators[i]
            , val1 = evaluator(ctx, aliases1, obj1)
            , val2 = evaluator(ctx, aliases2, obj2)
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

    function groupStep(ctx, arr) {
      var result = {};

      for ( var i = 0, ilen = arr.length; i < ilen; i++ ) {
        var target = result
          , elem = arr[i]
          , obj = elem.obj
          , aliases = elem.aliases;

        for ( var j = 0; j < glen; j++ ) {
          var key = getGroupKey(groups[j](ctx, aliases, obj));
          
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

    function aggregateStep(ctx, arr) {
      var result = util.createObjectArray(arr)
        , args = [ctx, result];

      for ( var i = 0; i < alen; i++ ) {
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

    function objEvaluator(ctx, aliases, obj) {
      var result = {};

      for ( var i = klen; i--; ) {
        var key = keys[i];
        result[key] = template[key](ctx, aliases, obj);
      }
      return result;
    }
  }

  function createArrEvaluator(node) {
    var template = wrapEvaluatorArray(node[1])
      , tlen = template.length;

    return arrEvaluator;

    function arrEvaluator(ctx, aliases, obj) {
      var result = [];
      for ( var i = tlen; i--; ) {
        result[i] = template[i](ctx, aliases, obj);
      }
      return result;
    }
  }

  function createFuncEvaluator(node) {
    var func = getExtension(node[1])
      , template = wrapEvaluatorArray(node[2])
      , tlen = template.length;

    return funcEvaluator;

    function funcEvaluator(ctx, aliases, obj) {
      var funcArgs = [];
      for ( var i = tlen; i--; ) {
        funcArgs[i] = template[i](ctx, aliases, obj);
      }
      return func.apply(obj, [ctx].concat(funcArgs));
    }
  }

  function createMergeEvaluator(node) {
    var template = wrapEvaluatorArray(node[1])
      , tlen = template.length;

    return mergeEvaluator;

    function mergeEvaluator(ctx, aliases, obj) {
      var result = {}; // We don't mutate the first item

      for ( var i = 0; i < tlen; i++ ) {
        var elem = template[i](ctx, aliases, obj)
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

    function notEvaluator(ctx, aliases, obj) {
      return !$1(ctx, aliases, obj);
    }
  }

  function createNegEvaluator(node) {
    var $1 = createEvaluator(node[1]);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(ctx, aliases, obj) {
      return -$1(ctx, aliases, obj);
    }
  }

  function createAndEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? andEvaluator : andEvaluator();

    function andEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1;
      if ( !lval ) {
        return lval;
      }
      return $2_func ? $2(ctx, aliases, obj) : $2;
    }
  }

  function createOrEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? orEvaluator : orEvaluator();

    function orEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1;
      if ( lval ) {
        return lval;
      }
      return $2_func ? $2(ctx, aliases, obj) : $2;
    }
  }

  function createAddEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? addEvaluator : addEvaluator();

    function addEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval + rval;
    }
  }

  function createSubEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? subEvaluator : subEvaluator();

    function subEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval - rval;
    }
  }

  function createMulEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? mulEvaluator : mulEvaluator();

    function mulEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval * rval;
    }
  }

  function createDivEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? divEvaluator : divEvaluator();

    function divEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval / rval;
    }
  }

  function createModEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? modEvaluator : modEvaluator();

    function modEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval % rval;
    }
  }

  function createEqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? eqEvaluator : eqEvaluator();

    function eqEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval == rval;
    }
  }

  function createNeqEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? neqEvaluator : neqEvaluator();

    function neqEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval != rval;
    }
  }

  function createGtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gtEvaluator : gtEvaluator();

    function gtEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval > rval;
    }
  }

  function createGteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? gteEvaluator : gteEvaluator();

    function gteEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval >= rval;
    }
  }

  function createLtEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? ltEvaluator : ltEvaluator();

    function ltEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval < rval;
    }
  }

  function createLteEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? lteEvaluator : lteEvaluator();

    function lteEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2;
      return lval <= rval;
    }
  }

  function createInEvaluator(node) {
    var $1 = createEvaluator(node[1])
      , $2 = createEvaluator(node[2])
      , $1_func = typeof $1 === 'function'
      , $2_func = typeof $2 === 'function';

    return $1_func || $2_func ? inEvaluator : inEvaluator();

    function inEvaluator(ctx, aliases, obj) {
      var rval = $2_func ? $2(ctx, aliases, obj) : $2;
      if ( Array.isArray(rval) ) {
        var item = $1_func ? $1(ctx, aliases, obj) : $1;
        return rval.indexOf(item) !== -1;
      }
      else if ( typeof rval === 'object' ) {
        return ( $1_func ? $1(ctx, aliases, obj) : $1 ) in rval;
      }
      else if ( rval !== null && rval !== undefined ) {
        return ( $1_func ? $1(ctx, aliases, obj) : $1 ) == rval;
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

    function reEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1
        , rval = $2_func ? $2(ctx, aliases, obj) : $2
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

    function asEvaluator(ctx, aliases, obj) {
      var lval = $1_func ? $1(ctx, aliases, obj) : $1;
      aliases[$2] = lval;
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

    function ternEvaluator(ctx, aliases, obj) {
      var cval = $1_func ? $1(ctx, aliases, obj) : $1;
      if ( cval ) {
        return $2_func ? $2(ctx, aliases, obj) : $2;
      }
      return $3_func ? $3(ctx, aliases, obj) : $3;
    }
  }

  function createPathEvaluator(rootEvaluator, pathComponents) {
    var path = wrapEvaluatorArray(slice.call(pathComponents, 1))
      , plen = path.length;

    return pathEvaluator;

    function pathEvaluator(ctx, aliases, obj) {
      var value = rootEvaluator(ctx, aliases, obj);
      for ( var i = 0; i < plen; i++ ) {
        if ( value === null || value === undefined ) {
          return value;
        }

        var key = path[i](ctx, aliases, obj);
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
}

// Exports
exports.createCompiler = createCompiler;
