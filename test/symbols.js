var nodeunit = require('nodeunit')
  , objeq = require('../junqi').objeq;

exports.symbols = nodeunit.testCase({
  setUp: function (callback) {
    this.data = [
      { "firstName": "Bill", "lastName": "Bradley", "age": 30 },
      { "firstName": "Thom", "lastName": "Bradford", "age": 40 },
      { "firstName": "Stefano", "lastName": "Rago", "age": 29 },
      { "firstName": "Fred", "lastName": "Wilkinson", "age": 50 },
      { "firstName": "Ted", "lastName": "Williams", "age": 20 },
      { "firstName": "Jed", "lastName": "Clampet", "age": 70 },
      { "firstName": "Will", "lastName": "Robinson", "age": 45 },
      { "firstName": "John", "lastName": "Jacob", "age": 54 },
      { "firstName": "Thom", "lastName": "Smith", "age": 15 },
      { "firstName": "Bill", "lastName": "Blake", "age": 90 },
      { "firstName": "Hank", "lastName": "Williams", "age": 70 },
      { "firstName": "John", "lastName": "Cash", "age": 45 },
      { "firstName": "Joe", "lastName": "Strummer", "age": 54 },
      { "firstName": "Ted", "lastName": "Turner", "age": 15 }
    ];

    callback();
  },

  "Forward Symbol Passing Works": function (test) {

    test.equal(objeq(this.data, "this as %parent -> age | this > 40 -> { name: %parent.firstName + ' ' + %parent.lastName, age }")[0].name, "Fred Wilkinson",
      "Passed Parent is correct");

    test.done();
  }
});
