# junqi (JSONiq Implementation in Pure JavaScript)

## Introduction

### What Does it Do?

### What Doesn't it Do?

### Current Status

## Getting Started

### Installation
A pre-built version of the parser and minified code are already included, but if you'd like to build them yourself and you have node.js, then you can do so by issuing the following command from the package's top-level directory:

    > npm install; npm run-script build

This will also install any development dependencies and run the nodeunit test suite.

### Inclusion in a Web Page
You can include the junqi Library on your web page with the following HTML:

    <script src="junqi.min.js" type="text/javascript"></script>

You can also include the unminified parser and processor with the following:

    <script src="junqi/junqi-parser.js" type="text/javascript"></script>
    <script src="junqi/junqi.js" type="text/javascript"></script>

### Inclusion in Node.js
Assuming you have installed the junqi Library into your project with npm, you can include it in a node.js module with the following:

    var $junqi = require('junqi');

### Performing a First Query

## More Information

## Credits and Acknowledgements
This module defines both a Lexer and Grammar that use the Jison Parser Generator (http://zaach.github.com/jison/)

## License (MIT License)
Copyright (c) 2013 Thomas S. Bradford

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
