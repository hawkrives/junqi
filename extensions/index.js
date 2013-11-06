/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var junqi = require('../junqi');

var DefaultExtensions = [

  // Extensions from Math Module **********************************************

  function abs(ctx, number) {
    return Math.abs(number);
  },
  
  function acos(ctx, number) {
    return Math.acos(number);
  },

  function asin(ctx, number) {
    return Math.asin(number);
  },

  function atan(ctx, number) {
    return Math.atan(number);
  },

  function atan2(ctx, x, y) {
    return Math.atan2(x, y);
  },

  function ceil(ctx, number) {
    return Math.ceil(number);
  },

  function cos(ctx, number) {
    return Math.cos(number);
  },

  function exp(ctx, number) {
    return Math.exp(number);
  },

  function floor(ctx, number) {
    return Math.floor(number);
  },

  function log(ctx, number) {
    return Math.log(number);
  },

  function pow(ctx, base, exp) {
    return Math.pow(base, exp);
  },

  function round(ctx, number) {
    return Math.round(number);
  },

  function sin(ctx, number) {
    return Math.sin(number);
  },

  
  function sqrt(ctx, number) {
    return Math.sqrt(number);
  },
  
  function tan(ctx, number) {
    return Math.tan(number);
  },

  // Other Math Extensions ****************************************************
  
  function avg(ctx, value) {
    if ( !Array.isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    if ( value.length === 0 ) return 0;
    for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
    return r / l;
  },

  function count(ctx, value) {
    return Array.isArray(value) ? value.length : 0;
  },

  function max(ctx, value) {
    if ( !Array.isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    return Math.max.apply(Math, value);
  },

  function median(ctx, value) {
    if ( !Array.isArray(value) ) {
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

  function min(ctx, value) {
    if ( !Array.isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    return Math.min.apply(Math, value);
  },

  function number(ctx, value) {
    return Number(value);
  },

  function sum(ctx, value) {
    if ( !Array.isArray(value) ) {
      return typeof value === 'number' ? value : NaN;
    }
    for ( var i = 0, res = 0, l = value.length; i < l; res += value[i++] );
    return res;
},

  // Array Extensions *********************************************************

  function first(ctx, value) {
    if ( !Array.isArray(value) ) {
      return value;
    }
    return value[0];
  },

  function last(ctx, value) {
    if ( !Array.isArray(value) ) {
      return value;
    }
    if ( value.length ) return value[value.length - 1];
    return null;
  },

  function unique(ctx, value) {
    if ( !Array.isArray(value) ) {
      return value;
    }
    // TODO: This
  },

  // String Extensions ********************************************************

  function lower(ctx, value) {
    return typeof value === 'string' ? value.toLowerCase() : value;
  },

  function split(ctx, value, delim, idx) {
    var val = String(value).split(delim || ' \n\r\t');
    return typeof idx !== 'undefined' ? val[idx] : val;
  },

  function string(ctx, value) {
    return String(value);
  },

  function title(ctx, value) {
    if ( typeof value !== 'string' ) return value;
    return value.replace(/\w\S*/g, function (word) {
      return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
  },

  function upper(ctx, value) {
    return typeof value === 'string' ? value.toUpperCase() : value;
  },

  // JSON Extensions **********************************************************

  function jsonParse(ctx, value) {
    return JSON.parse(value);
  },

  function jsonStringify(ctx, value) {
    return JSON.stringify(value);
  }

];

// Register these Extensions in the default junqi environment
junqi.registerExtensions(DefaultExtensions);

// Exports
exports.DefaultExtensions = DefaultExtensions;
