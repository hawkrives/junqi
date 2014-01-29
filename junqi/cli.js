#!/usr/bin/env node

/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var fs = require('fs')
  , junqi = require('./junqi');

// Standard Extensions
require('../extensions');

var slice = Array.prototype.slice;

if ( require.main === module ) {
  commandLine.apply(null, slice.call(process.argv, 2));
}

// Command Line Processing ****************************************************

/**
 * Executes a junqi command-line operation.  Each argument is treated as
 * it would be had it come from the operating system's shell and should
 * be a string.  This function is normally invoked automatically when the
 * cli.js script is called directly.
 *
 * Example:
 *   commandLine("-lang", "objeq", "-in", "test.json", "where" "active");
 *
 * @param {...String} [arguments] usage info displayed if no args provided
 */
function commandLine() {
  "use strict";

  var compiler, input, query, output
    , args = parseArguments(arguments);

  startCommandLine();

  function startCommandLine() {
    // Check Language Selection
    var lang = args.lang || 'objeq';
    compiler = junqi[lang.toLowerCase()];

    if ( !compiler || compiler.name !== 'languageFunction' ) {
      errorOut("Invalid language specified '" + lang + "'");
    }

    // Check Query Arguments
    if ( !args.query && !args.queryString ) {
      errorOut("No query specified");
    }
    else if ( args.query && args.queryString ) {
      errorOut("Both a query file and query string were specified");
    }

    // Read the Input Data
    readInput();
  }

  // Reading Input JSON from File or stdin ************************************
  
  function readInput() {
    if ( args.in ) {
      input = JSON.parse(fs.readFileSync(args.in));
      readQuery();
      return;
    }
    
    // Otherwise, we're reading from stdin
    if ( process.stdin.isTTY ) {
      errorOut("Only piped input is accepted from stdin");
      return;
    }

    var buffers = [];
    process.stdin.resume();
    process.stdin.on('data', function(data) {
      buffers.push(data);
    });
    
    process.stdin.on('end', function() {
      input = JSON.parse(Buffer.concat(buffers));
      readQuery();
    });
  }

  // Reading Query String from File or Command-line ***************************
  
  function readQuery() {
    if ( args.query ) {
      query = compiler(fs.readFileSync(args.query).toString());
    }
    else {
      query = compiler(args.queryString);
    }
    performQuery();
  }

  // Perform The Query ********************************************************

  function performQuery() {
    var start = new Date()
      , result = query(input)
      , duration = new Date().getTime() - start.getTime();

    output = JSON.stringify(result, null, 2) + '\n';
    writeOutput(duration);
  }
  
  // Write Query Result *******************************************************

  function writeOutput(duration) {
    if ( args.out ) {
      fs.writeFileSync(args.out, output);
    }
    else {
      var buf = new Buffer(output);
      process.stdout.write(buf, 0, buf.length);
    }
    if ( args.out || process.stdout.isTTY ) {
      console.info("---");
      console.info("Query executed in " + duration + "ms");
    }
    process.exit(0);
  }

  // Support Functions ********************************************************

  function parseArguments(passedArguments) {
    var optionRegex = /^-([a-zA-Z_][a-zA-Z_0-9]*)$/
      , result = { }
      , queryStrings = [];

    for ( var i = 0, len = passedArguments.length; i < len; ) {
      var arg = passedArguments[i++];
      var match = optionRegex.exec(arg);
      if ( match ) {
        if ( queryStrings.length ) {
          errorOut("Options must appear before a query string");
        }
        var argName = match[1]
          , argValue = i < len ? passedArguments[i++] : null;
        result[argName] = argValue;
      }
      else {
        queryStrings.push(arg);
      }
    }
    if ( queryStrings.length ) {
      result.queryString = queryStrings.join(' ');
    }
    return result;
  }

  function errorOut(message) {
    displayUsage();
    console.error("Error!");
    console.error("");
    console.error("  " + message);
    console.error("");
    process.exit(1);
  }

  function displayVersion() {
    console.info("junqi v" + junqi.VERSION);
    console.info("");
  }

  function displayUsage() {
    displayVersion();
    console.info("Usage:");
    console.info("");
    console.info("  junqi (options) <query string>");
    console.info("");
    console.info("Where:");
    console.info("");
    console.info("  Options:");
    console.info("");
    console.info("  -lang <language>  - Currently 'objeq' or 'jsoniq'");
    console.info("  -in <filename>    - Input file, otherwise pipe from stdin");
    console.info("  -out <filename>   - Output file, otherwise use stdout");
    console.info("  -query <filename> - Query file, otherwise command line");
    console.info("");
    console.info("  Query String (if -query not provided):");
    console.info("");
    console.info("    An objeq or JSONiq Query String");
    console.info("");
  }
}

// Exports
exports.commandLine = commandLine;
