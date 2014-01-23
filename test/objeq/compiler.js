var nodeunit = require('nodeunit')
  , objeq = require('../../junqi').objeq;

exports.compiler = nodeunit.testCase({
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

  "Function Body Comments": function (test) {
    var query = objeq(function(color) {/*
      # this is an example of a compiled function body comment
      where %color in colors
      group by fullName
      select {
        fullName, 
        colors: colors[1],
        chosen: %color
      }
    */});
    
    test.equal(query(this.data, 'red')[3].colors, "green",
      "Function Body Comments compile");

    test.equal(query(this.data, 'red')[3].chosen, "red",
      "Parameters passed through all steps");

    test.done();
  }
});
