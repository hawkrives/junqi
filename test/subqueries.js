var nodeunit = require('nodeunit')
  , objeq = require('../junqi').objeq;

exports.subqueries = nodeunit.testCase({
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

  "Subqueries Work": function (test) {
    var query = objeq(function(favorite) {/*
     # if someone has %favorite as a color, return only the other colors
     where %favorite in colors
     select {
       fullName,
       colors: [colors where this != %favorite]
     }
    */});

    var result = query(this.data, 'red');
    
    test.equal(result[2].fullName, "Jed Clampet", 
      "Main query filtering is correct");

    test.equal(result[2].colors[0], "green",
      "Subquery filtering is correct");
    
    test.done();
  }
});
