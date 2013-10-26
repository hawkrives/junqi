var nodeunit = require('nodeunit')
  , objeq = require('../junqi').objeq;

// Load the Standard Extensions
require('../junqi/extensions');

exports.aggregates = nodeunit.testCase({
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
      { "firstName": "John", "lastName": "Cash", "age": 45 },
      { "firstName": "Joe", "lastName": "Strummer", "age": 54 },
      { "firstName": "Ted", "lastName": "Turner", "age": 15 }
    ];

    callback();
  },

  "Single Aggregations Work": function (test) {
    test.equal(objeq(this.data, "-> age := avg")[0], 44.785714285714285,
      "Average Age is correct");

    test.equal(objeq(this.data, "-> age := sum")[0], 627,
      "Sum of Ages is correct");

    test.done();
  },

  "Chained Aggregations Work": function (test) {
    test.equal(objeq(this.data, "-> age := avg, round")[0], 45,
      "Rounded Average Age is correct");

    test.done();
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
