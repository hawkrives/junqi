# The Junqi Compiler

The Junqi compiler accepts a tree of abstract syntax nodes and yields a single JavaScript closure to service the query represented by the tree.  Internally, this closure is a nested set of closures rather than a dynamically generated function using eval or the Function constructor.

There were several reasons for generating closures instead of concatenating JavaScript code:

  * Comprehension and Debugging: Have you ever tried to debug code that was dynamically generated at runtime?  It's a pain in the ass.

  * Security: Because queries compile down to a set of closures rather than strings to be evaluated, the risk of injection attacks is minimized.

  * Performance: The first rule of optimization?  Don't optimize.  That said, under V8, Junqi queries still perform quite well compared to code that is dynamically generated.

A future version of the junqi compiler may end up producing dynamic code, but this won't happen until the compiler interface has first stabilized.

## Abstract Syntax Tree

The tree that is passed to the Junqi compiler consists of nested arrays with additional metadata.  The first array element is a token that designates the evaluator being represented and subsequent elements represent arguments to be passed into that evaluator's internal constructor.  For example, this expression:

```javascript
5 * 10 + 15 / 3
```

Might yield the following syntax tree:

```javascript
['add', 
  ['mul', 5, 10],
  ['div', 15, 3]
]
```

**Note:** Each of these arrays also has a property called `isNode` with a value of true.  This allows junqi to distinguish between a syntax node and a literal array.  The junqi parser interface methods will attach this property automatically when functions like `yy.node()` are called.

Junqi attempts to roll literals up wherever possible, so the previous syntax tree might produce a closure equivalent to the following:

```javascript
function $1(obj, ctx) {
  return 55;
}
```

But if the expression being compiled was:

```javascript
5 * 10 + age / 3
```

Then the generated syntax tree might look like this:

```javascript
['add',
  ['mul', 5, 10],
  ['div', 
    ['local', ['age']],
    3
  ]
]
```

And the generated closures might be equivalent to this:

```javascript
function $1(obj, ctx) {
  return 50 + $2(obj, ctx);
}
function $2(obj, ctx) {
  return $3(obj, ctx) / 3;
}
function $3(obj, ctx) {
  return obj['age'];
}
```

This may beg the question "What are obj and ctx?"  Glad you asked.

`obj` is the object that is currently be evaluated.  In the case of a step, this is an input array, but usually it's an individual element of an array being processed.  So nearly all of the closures that junqi generates will do something with `obj`.

`ctx` is the query context associated with that object and any of its encompassing scopes.  For example, a parameter attached to an `obj` is stored in the `ctx` variable.  The context is also used to retrieve arguments passed into the compiled query, though they may be shadowed by more immediate parameters.  `ctx` is generally only used the `param` and `assign` evaluators.

## Evaluators
Evaluators are the building blocks of junqi compiled expressions.  Anything that takes a single input object and yields a single output object is represented as an Evaluator.

### local(pathComponents\[Evaluator\])
Evaluates a local path where properties are evaluated starting at the currently evaluated object.  For example, to drill into `this.colors[1].name`, the following nodes might be generated:

```javascript
['local', ['colors', 1, 'name']]
```

But also nested expressions might evaluated:

```javascript
['local', 
  ['colors', ['local', ['favoriteColor']]]
]
```

Which will drill into `colors` based on the value returned by `favoriteColor` (`this.colors[this.favoriteColor]` in objeq).

### param(param(String|Number), pathComponents\[Evaluator\])
Evaluates a parameter path, where the param is either a named parameter in the context, or a numbered parameter indexed in the order that it was passed to the compiled closure.

For example, drilling into the second parameter passed (`%2.name` in objeq):

```javascript
['param', 2, ['name']]
```

### obj(objectSkeleton{<name>:Evaluator})
Synthesizes a new object based on the named evaluators.  For example, this objeq query `{ firstName, lastName, fullName: firstName + ' ' + lastName }` might produce the following syntax tree:

```javascript
['obj', {
  firstName: ['local', ['firstName']],
  lastName: ['local', ['lastName']],
  fullName: ['add', 
    ['add', ['local', ['firstName']], ' '],
    ['local', ['lastName']]
  ]
}]
```

### arr(arraySkeleton\[Evaluator\])
Synthesizes a new array based on the set of evaluators.  For example, this objeq query `[1, 2, firstName, 4, %test.color]` might produce the following syntax tree:

```javascript
['arr', [
  1,
  2,
  ['local', ['firstName']],
  4,
  ['param', 'test', ['color']]
]]
```

### func(funcName, argNodes\[Evaluator\])
Calls an extension function registered with the junqi environment.  Arbitary method calling is not permitted in junqi, and so the funcName can only be evaluated as a String.  For example, a call to `area(width, height)` would yield the following syntax tree:

```javascript
['func', 'area', [
  ['local', ['width']],
  ['local', ['height']]
]]
```

### merge(mergedNodes\[Evaluator\])
Merges a set of objects, similar to underscore's `extend` function, but yielding a new object rather than targeting the first.

```javascript
['merge', [
  ['local'], // equivalent to 'this'
  ['obj', {
    fullName: ['add', 
      ['add', ['local', ['firstName']], ' '],
      ['local', ['lastName']]
    ]
  }]
]]
```

### not(node)
Logical 'not' of the provided node.  Example:

```javascript
['not', ['local', ['dirty']]]
```

### neg(node)
Arithmetic negation of the provided node.  Example:

```javascript
['neg', ['local', ['count']]]
```

### and(leftNode, rightNode)
Boolean 'and' of the provided nodes: Example:

```javascript
['and',
  ['local', ['dirty']],
  ['gt', ['local', ['count']], 10]
]
```

### or(leftNode, rightNode)
Boolean 'or' of the provided nodes.

```javascript
['or',
  ['local', ['dirty']],
  ['gt', ['local', ['count']], 10]
]
```

### add(leftNode, rightNode)
Arithmetic addition of the provided nodes.

```javascript
['add',
  ['local', ['puppies']],
  ['local', ['kittens']]
]
```

### sub(leftNode, rightNode)
Arithmetic subtraction of the provided nodes.

```javascript
['sub',
  ['local', ['total']],
  ['local', ['kittens']]
]
```

### mul(leftNode, rightNode)
Arithmetic multiplication of the provided nodes.

```javascript
['mul',
  ['local', ['puppies']],
  ['local', ['feedings']]
]
```

### div(leftNode, rightNode)
Arithmetic division of the provided nodes.

```javascript
['div',
  ['local', ['totalFeedings']],
  ['local', ['puppies']]
]
```

### mod(leftNode, rightNode)
Modulo (remainder) of the provided nodes.

```javascript
['mod',
  ['local', ['index']],
  ['param', 'columns']
]
```

### eq(leftNode, rightNode)
Comparitive equality of the provided nodes.

```javascript
['eq',
  ['func', 'count', [
    ['local', ['children']]
  ]],
  10
]
```

### neq(leftNode, rightNode)
Comparitive inequality of the provided nodes.

```javascript
['neq',
  ['func', 'count', [
    ['local', ['children']]
  ]],
  ['param', 'ignoreCount']
]
```

### gt(leftNode, rightNode)
leftNode greater than rightNode.
// TODO: Example

### gte(leftNode, rightNode)
leftNode greater than or equal to rightNode.
// TODO: Example

### lt(leftNode, rightNode)
leftNode less than rightNode.
// TODO: Example

### lte(leftNode, rightNode)
leftNode less than or equal to rightNode.
// TODO: Example

### in(elemNode, setNode)
elemNode is an element of (or is equal to) setNode.
// TODO: Example

### re(regexNode, testNode)
testNode matches the regular expression defined by regexNode, returning true or false.
// TODO: Example

### tern(conditionNode, trueNode, falseNode)
Returns evaluation of trueNode if conditionNode returns 'truthy,' otherwise returns evaluation of falseNode.
// TODO: Example

### assign(paramName, exprNode)
Stores the result of exprNode into the current query evaluation context as 'paramName,' and then passes that same result up the stack.

```javascript
['assign',
  'fullName',
  ['add', 
    ['add', ['local', ['firstName']], ' '],
    ['local', ['lastName']]
  ]
]
```

### block(statementNodes)
Evaluates a group of expressions, returning the result of the last in the group.  Useful for variable assignments.

```javascript
['block', [
  ['assign', 'parent', ['local']],
  ['assign', 'children', ['local', ['children']]],
  true
]]
```

### subquery(inputNode, queryNode)
Passes the result of inputNode into queryNode as a new set of source data.  The result of queryNode is returned up the call stack.  Subqueries shadow the current query context, replacing the `data` parameter, and are most useful when queryNode is a 'steps' node.

For example, this objeq subquery `[addresses where active]` which filters the elements of addresses to those items with a truthy active flag, might produce the following syntax tree:

```javascript
['assign',
  'filteredAddresses',
  ['subquery',
    ['local', ['addresses']],
    ['steps' [
      ['filter', ['local', ['active']]]
    ]]
  ]
]
```

### steps(stepDefinitions\[Step\])
Defines a set of steps meant to filter, mutate, group, order and/or aggregate an input array.  

The set of steps is a special containership wherein each element is associated with a context.  This context serves as a container for named values, either immediately associated with the current element, or inherited from a parent context (such as parameters passed into the compiled closure).

```javascript
['steps', [
  ['expand', ['block', [
    ['assign', 'parent', ['local']],
    ['local', ['addresses']]
  ]],
  ['filter', ['eq', ['local', ['postalCode']], '02128']],
  ['select', ['param', 'parent']]
]]
```

**Note:** Because contexts are being associated with each element, creating a step pipeline can be an expensive operation.  Therefore it's preferable to produce a syntax tree that performs this action as infrequently as possible.  As the compiler evolves, and optimizations are introduced, this may become less of an issue.

## Steps
Steps are the transformation primitives of junqi compiled queries.  They take input arrays and produce output arrays.

### filter(filterNode)
Filters the current array based on the evaluated result of filterNode.  If the result for any particular element is not truthy, the element is not carried forward into the resulting array.  For example, this objeq query `where postalCode == '02128'` produces the following syntax tree:

```javascript
['filter', ['eq', ['local', ['postalCode']], '02128']]
```

### select(selectedNodes\[Evaluator\])
Evaluates an element from the input array and emits the result of that evaluation into the output array.  Multiple evaluations may be performed per element, resulting in an array literal added to the output array.  For example, this objeq query `select cousins, children` produces the following syntax tree:

```javascript
['select', [
  ['local', ['cousins']],
  ['local', ['children']]
]]
```

### expand(expandedNode)
Emits the individual elements of the expandedNode evaluation to the output array.  Thus, a single input element may yield multiple output elements.  The objeq query

```
expand children
where age > 10
```

might yield the following syntax tree:

```javascript
['steps', [
  ['expand', ['local', ['children']]],
  ['filter', ['gt', ['local', ['age']], 10]]
]]
```

### extend(extendedNodes\[Evaluator\])
Similar to the `merge` Evaluator, except meant to operate as a step.  Also important is that the current element of the input array is always the implicit target of the merge.

```javascript
['extend', [
  ['obj', {
    fullName: ['add',
      ['add', ['local', ['firstName']], ' '],
      ['local', ['lastName']]
    ]
  }]
]]
```

### sort(orderingNodes\[{expr:Evaluator, ascending:Boolean}\])
Sorts the resulting array based on the expression evaluated as part of the provided orderingNodes.  For example, the objeq query `order by gender, age` might produce the following syntax tree:

```javascript
['sort', [
  { expr: ['local', ['group']], ascending: true },
  { expr: ['local', ['age']], ascending: true }
]]
```

### group(groupingNodes\[Evaluator\])
Groups the resulting array based on the evaluation of the provided groupingNodes.  For example, the following objeq query `group by class, color` might produce the following syntax tree:

```javascript
['group', [
  ['local', ['class']],
  ['local', ['color']]
]]
```

### aggregate(extensionNames\[String\])
Passes the current input array (or group subset) through a set of extension functions to generate an aggregated set of results.  For example, the following objeq query

```
group by color as %color
aggregate count
select {
  color: %color,
  count: this
}
```

might produce the following syntax tree:

```javascript
['steps', [
  ['group', [
    ['assign', 'color', ['local', ['color']]]
  ]],
  ['aggregate', ['count']],
  ['select', [
    ['obj', {
      color: ['param', 'color'],
      count: ['local']
    }]
  ]]
]]
```
