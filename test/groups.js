var nodeunit = require('nodeunit')
  , objeq = require('../junqi').objeq;

// Load the Standard Extensions
require('../junqi/extensions');

exports.groups = nodeunit.testCase({
  setUp: function (callback) {
    this.data = [
      { "firstName": "Thom", "lastName": "Bradford", "age": 40 },
      { "firstName": "Bill", "lastName": "Bradley", "age": 30 },
      { "firstName": "Stefano", "lastName": "Rago", "age": 29 },
      { "firstName": "Fred", "lastName": "Wilkinson", "age": 50 },
      { "firstName": "Ted", "lastName": "Williams", "age": 20 },
      { "firstName": "Jed", "lastName": "Clampet", "age": 70 },
      { "firstName": "Will", "lastName": "Williams", "age": 45 },
      { "firstName": "John", "lastName": "Bradley", "age": 54 },
      { "firstName": "Thom", "lastName": "Bradford", "age": 15 },
      { "firstName": "Bill", "lastName": "Blake", "age": 90 },
      { "firstName": "Hank", "lastName": "Bradley", "age": 70 },
      { "firstName": "John", "lastName": "Ash", "age": 45 },
      { "firstName": "Joe", "lastName": "Strummer", "age": 54 },
      { "firstName": "Ted", "lastName": "Turner", "age": 15 }
    ];

    callback();
  },

  "Grouping Aggregation Works": function (test) {
    test.equal(objeq(this.data, "group firstName := count")[0], 2,
      "Single-level grouped count is correct");

    test.equal(objeq(this.data, "group lastName, firstName := count")[0], 2,
      "Nested grouped count is correct");

    test.equal(objeq(this.data, "group lastName + firstName := count")[0], 2,
      "Expression-based grouped count is correct");

    test.done();
  }
});
