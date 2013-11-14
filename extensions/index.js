/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var junqi = require('../junqi');

var isArray = Array.isArray;

var DefaultExtensions = {

  // Extensions from Math Module **********************************************

  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  atan2: Math.atan2,
  ceil: Math.ceil,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  log: Math.log,
  pow: Math.pow,
  round: Math.round,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
  
  // Other Math Extensions ****************************************************
  
  avg: function avg(value) {
    if ( !isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    if ( value.length === 0 ) return 0;
    for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
    return r / l;
  },

  count: function count(value) {
    return isArray(value) ? value.length : 0;
  },

  max: function max(value) {
    if ( !isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    return Math.max.apply(Math, value);
  },

  median: function median(value) {
    if ( !isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    if ( value.length === 0 ) return 0;
    var temp = value.slice(0).order();
    if ( temp.length % 2 === 0 ) {
      var mid = temp.length / 2;
      return (temp[mid - 1] + temp[mid]) / 2;
    }
    return temp[(temp.length + 1) / 2];
  },

  min: function min(value) {
    if ( !isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    return Math.min.apply(Math, value);
  },

  number: Number,

  sum: function sum(value) {
    if ( !isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    for ( var i = 0, res = 0, l = value.length; i < l; res += value[i++] );
    return res;
},

  // Array Extensions *********************************************************

  first: function first(value) {
    if ( !isArray(value) ) {
      return value;
    }
    return value[0];
  },

  last: function last(value) {
    if ( !isArray(value) ) {
      return value;
    }
    if ( value.length ) return value[value.length - 1];
    return null;
  },

  empty: function empty(value) {
    if ( !isArray(value) ) {
      return value == null;
    }
    return value.length > 0;
  },

  // String Extensions ********************************************************

  lower: function lower(value) {
    return typeof value === 'string' ? value.toLowerCase() : value;
  },

  split: function split(value, delim, idx) {
    var val = String(value).split(delim || ' \n\r\t');
    return typeof idx !== 'undefined' ? val[idx] : val;
  },

  string: String,

  title: function title(value) {
    if ( typeof value !== 'string' ) return value;
    return value.replace(/\w\S*/g, function (word) {
      return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
  },

  upper: function upper(value) {
    return typeof value === 'string' ? value.toUpperCase() : value;
  },

  // JSON Extensions **********************************************************

  jsonParse: JSON.parse,
  jsonStringify: JSON.stringify
};

// Register these Extensions in the default junqi environment
junqi.registerExtensions(DefaultExtensions);

// Exports
exports.DefaultExtensions = DefaultExtensions;
