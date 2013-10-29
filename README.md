# junqi (JavaScript Querying for Node.js)

## Introduction
junqi is a Node.js library that allows JavaScript data to be queried more conveniently.  Its goal is to consolidate and expose multiple query grammars with a single backend.  Initially, the objeq grammar will be supported, eventually followed by JSONiq [jsoniq] support.

### What Does it Do?
It lets you take a JavaScript Array and query it.  Querying includes one or more steps of filtering, drill-down, synthesis, sorting and/or aggregation.

### Current Status
The query engine is still under active development  Performance will continue to improve and language features will continue to be implemented.

## Getting Started
Getting started is so easy!

### Installation
Pre-built version of the parsers are already included, but if you'd like to build them yourself then you can do so by issuing the following command from the package's top-level directory:

    > npm install; npm run-script build

This will also install any development dependencies and run the nodeunit test suite.

### Inclusion in Node.js
Assuming you have installed the junqi package into your project with npm, you can include it in a Node.js module with the following:

    var junqi = require('junqi');

For access to a specific grammar:

    var objeq = require('junqi').objeq;

### Performing a First Query
Fire up the Node.js REPL and type the following into the console (minus comments):

    // Import the objeq Grammar
    var objeq = require('junqi').objeq;

    // Create a data Array to be queried later
    var data = [
      { name: 'Barbara', age: 25, gender: 'female' },
      { name: 'Ronald', age: 62, gender: 'male' },
      { name: 'Robert', age: 54, gender: 'male' },
      { name: 'Jessica', age: 48, gender: 'female' }
    ];

    // This will compile a junqi query that filters only those
    // Objects having a name property starting with 'Ro' and then
    // returns a string that combines name and age properties
    var query = objeq("'^Ro' =~ name -> name + ' is ' + age");

    // This performs the query against the 'data' Array and
    // returns the result in 'res'
    var res = query(data);

    // --> res now contains:
    //  [ 'Ronald is 62 years old',
    //    'Robert is 54 years old' ]

## More Information
For more information about how to interact with the junqi library and its API, see the API Reference at doc/API-Reference.md

For more information about the objeq grammar itself, see the objeq Grammar Reference at doc/Objeq-Reference.md

## Credits and Acknowledgements
This module defines both a Lexer and Grammar that use the Jison Parser Generator (http://zaach.github.com/jison/)

The objeq grammar was originally developed by Thomas Bradford and Stefano Rago for Agilo Software GmbH (http://www.agilosoftware.com/)

## License (MIT License)
Copyright (c) 2013 Thomas S. Bradford

Portions Copyright (c) 2012 Agilo Software GmbH

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

[jsoniq]:   http://www.jsoniq.org/
