var nodeunit = require('nodeunit')
  , objeq = require('../../junqi').objeq;

exports.arrays = nodeunit.testCase({
  setUp: function (callback) {
    this.data = [
      { "fullName": "Thom Bradford", "colors": ['red', 'green', 'blue'] },
      { "fullName": "Bill Bradley", "colors": ['brown', 'black'] },
      { "fullName": "Stefano Rago", "colors": ['red', 'black'] },
      { "fullName": "Fred Wilkinson", "colors": ['purple'] },
      { "fullName": "Ted Williams", "colors": ['brown', 'orange'] },
      { "fullName": "Jed Clampet", "colors": ['red', 'green'] },
      { "fullName": "Will Williams", "colors": ['blue', 'white'] },
      { "fullName": "John Bradley", "colors": ['magenta'] },
      { "fullName": "Thom Bradford", "colors": [] },
      { "fullName": "Bill Blake", "colors": ['red', 'green', 'blue'] },
      { "fullName": "Hank Bradley", "colors": ['orange', 'purple', 'yellow'] },
      { "fullName": "John Ash", "colors": ['yellow'] },
      { "fullName": "Joe Strummer", "colors": [] },
      { "fullName": "Ted Turner", "colors": ['blue', 'black', 'gray'] }
    ];

    callback();
  },

  "Array Access Works": function (test) {
    var query = "where 'red' in colors -> { fullName, colors: colors[1] }";
    test.equal(objeq(this.data, query)[3].colors, "green",
      "Array-indexed Value returned is correct");

    test.done();
  }
});
