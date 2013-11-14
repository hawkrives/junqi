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

commandLine();

// Command Line Processing ****************************************************

function commandLine() {
  "use strict";

  var args = parseArguments()
    , inData, query, outData;

  // Check Language Selection
  var lang = args.lang || 'objeq'
    , compiler = junqi[lang.toLowerCase()];

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

  // Begin
  readInput();

  // Reading Input JSON from File or stdin ************************************
  
  function readInput() {
    if ( args.in ) {
      inData = JSON.parse(fs.readFileSync(args.in));
      readQuery();
      return;
    }
    
    // Otherwise, we're reading from stdin
    var buffers = [];
    process.stdin.resume();
    process.stdin.on('data', function(data) {
      buffers.push(data);
    });
    
    process.stdin.on('end', function() {
      inData = JSON.parse(Buffer.concat(buffers));
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
    outData = JSON.stringify(query(inData), null, 2) + '\n';
    writeOutput();
  }
  
  // Write Query Result *******************************************************

  function writeOutput() {
    if ( args.out ) {
      fs.writeFileSync(args.out, outData);
    }
    else {
      var buf = new Buffer(outData);
      process.stdout.write(buf, 0, buf.length);
    }
    process.exit(0);
  }

  // Support Functions ********************************************************

  function parseArguments() {
    var optionRegex = /^-([a-zA-Z_][a-zA-Z_0-9]*)$/
      , argv = process.argv
      , result = { }
      , queryStrings = [];

    for ( var i = 2, len = argv.length; i < len; ) {
      var arg = argv[i++];
      var match = optionRegex.exec(arg);
      if ( match ) {
        if ( queryStrings.length ) {
          errorOut("Options must appear before a query string");
        }
        var argName = match[1]
          , argValue = i < len ? argv[i++] : null;
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
    displayVersion();
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
    console.info("Usage:");
    console.info("");
    console.info("  junqi (options) <query string>");
    console.info("");
    console.info("Where:");
    console.info("");
    console.info("  Options:");
    console.info("");
    console.info("    -lang <language>  - Currently 'objeq' or 'jsoniq'");
    console.info("    -in <filename>    - Input file, otherwise use stdin");
    console.info("    -out <filename>   - Output file, otherwise use stdout");
    console.info("    -query <filename> - Query file, otherwise command line");
    console.info("");
    console.info("  Query String (if -query not provided):");
    console.info("");
    console.info("    An objeq or JSONiq Query String");
    console.info("");
  }
}
