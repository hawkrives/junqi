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

var args = parseArguments();

// Read and Parse Input Data **************************************************

var inData;
if ( args.in ) {
  inData = JSON.parse(fs.readFileSync(args.in));
}
else {
  process.stdin.resume();
  inData = JSON.parse(fs.readSync(process.stdin));
  process.stdin.pause();
}

// Read and Compile Query *****************************************************

var lang = args.lang || 'objeq'
  , compiler = junqi[lang.toLowerCase()];

if ( !compiler || compiler.name !== 'languageFunction' ) {
  console.error("Invalid language specified '" + lang + "'");
  displayUsage();
  process.exit(1);
}

if ( typeof args.query === 'string' ) {
  query = compiler(fs.readFileSync(args.query).toString());
}
else if ( args.query.length ) {
  query = compiler(args.query.join(' '));
}
else {
  console.error("No query specified");
  displayUsage();
  process.exit(1);
}

// Write Query Result *********************************************************

var outData = JSON.stringify(query(inData), null, 2);
if ( args.out ) {
  fs.writeFileSync(outData);
}
else {
  console.log(outData);
}

process.exit(0);

// Support Functions **********************************************************

function parseArguments() {
  var optionRegex = /^-([a-zA-Z_][a-zA-Z_0-9]*)$/
    , argv = process.argv
    , result = { query: [] };

  for ( var i = 2, len = argv.length; i < len; ) {
    var arg = argv[i++];
    var match = optionRegex.exec(arg);
    if ( match ) {
      var argName = match[1]
        , argValue = i < len ? argv[i++] : null;
      result[argName] = argValue;
    }
    else {
      result.query.push(arg);
    }
  }
  return result;
}

function displayUsage() {
  console.info("junqi v" + junqi.VERSION);
  console.info("");
  console.info("Usage:");
  console.info("");
  console.info("  junqi (options) <query string>");
  console.info("");
  console.info("Where:");
  console.info("");
  console.info("  Options:");
  console.info("");
  console.info("    -lang <language>  - Currently 'objeq' or 'jsoniq'");
  console.info("    -in <filename>    - Input file, otherwise use stdin)");
  console.info("    -out <filename>   - Output file, otherwise use stdout");
  console.info("    -query <filename> - Query file, otherwise command line");
  console.info("");
  console.info("  Query String (if -query not provided):");
  console.info("");
  console.info("    An objeq or JSONiq Query String");
  console.info("");
}
