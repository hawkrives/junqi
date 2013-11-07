# junqi API Reference Manual
The junqi Library is very simple in how you interact with it.  It exposes a function for each supported grammar, and those functions can behave in multiple ways depending on the arguments that are provide to them.

## The Example Data
For all of these examples, let's assume that we're working with this Array of JavaScript Objects:

```javascript
var data = [
  { name: 'Barbara', age: 25, gender: 'female' },
  { name: 'Ronald', age: 62, gender: 'male' },
  { name: 'Robert', age: 54, gender: 'male' },
  { name: 'Jessica', age: 48, gender: 'female' }
];
```

## Querying Data
The primary function of the junqi Library, as you might have guessed, is the ability to query data.  This is done by providing an Array as the first argument to one of junqi's query functions, followed by a Query String and a set of optional Parameters:

```javascript
var objeq = require('junqi').objeq;
var res = objeq(data, "age > 40 && gender == 'female' -> name");
// --> Returns ['Jessica']
```

This could have also been parameterized and written as:

```javascript
var objeq = require('junqi').objeq;
var res = objeq(data, "age > %1 && gender == %2", 40, 'female');
// --> res now contains ['Jessica']
```

## Compiling Queries
If the first argument to the query function is a Query String rather than an Array then the library will assume you are trying to compile a Query.  The rules are essentially the same except that a JavaScript closure is returned that can then be used to process data repeatedly:

```javascript
var objeq = require('junqi').objeq;
var ageAndGender = objeq("age > %1 && gender == %2", 40, 'female');

var res = ageAndGender(data);
// --> res now contains ['Jessica']
```

This could have also been done using a Function payload, which creates named parameters in addition to numbered ones.  It also allows for better readability and maintenance, especially when your queries get large.
```javascript
var objeq = require('junqi').objeq;
var ageAndGender = objeq(function (age, gender) {/*
  age > %age && gender == %gender"
*/}, 40, 'female');

var res = ageAndGender(data);
// --> res now contains ['Jessica']
```

In this way, the parameters that are encountered by the `objeq()` function are treated as defaults for the compiled query, but can be overridden when calling the closure:

```javascript
var res = ageAndGender(data, 20);
// --> res now contains ['Barbara', 'Jessica']

var res = ageAndGender(data, 60, 'male');
// --> res now contains ['Ronald']
```

# Extensions
Defining Extension Functions for junqi is a relatively painless process.  Simply register the function with the `registerExtension()` method that is exposed by the `junqi` module:

```javascript
var junqi = require('junqi');
junqi.registerExtension('hello', function (firstName) {
  return "Hello " + firstName;
});
```

If you don't provide a name, junqi will inspect the function itself for its name.  So the following call yields the same result:

```javascript
junqi.registerExtension(function hello(firstName) {
  return "Hello " + firstName;
});
```

And then call the function from within your Query:

```javascript
var objeq = require('junqi').objeq;
var res = objeq(data, "-> hello(firstName)");
```

**Note:** If you've created an isolated junqi environment with `junqi.createJunqiEnvironment()` then you will need to register your extension against that environment.

## Three Simple Rules for Extension Writers
1. Your Extensions should be side-effect free and deterministic.  This is **very** important!
2. Inside of your Extension, the `this` variable will differ depending on context:
  * If used in the Predicate or Selector, it will refer to the current Item being processed
  * If used as an Aggregator, it will refer to the Intermediate Result (an Array) that was passed into the Aggregator chain
3. The first Extension in an Aggregator chain is passed a reference to the current query's Intermediate Results, its result is passed to the next Extension, and so on
