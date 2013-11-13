var nodeunit = require('nodeunit')
  , objeq = require('../junqi').objeq;

exports.selections = nodeunit.testCase({
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

  "Selections Work": function (test) {
    var query = "-> { firstName, fullName: firstName + ' ' + lastName }";
    test.equal(objeq(this.data, query)[0].firstName, "Thom",
      "Field of Object Literal exists");

    test.equal(objeq(this.data, query)[0].fullName, "Thom Bradford",
      "Expression Field of Object Literal exists");
    
    test.equal(objeq(this.data, query)[0].lastName, null,
      "Field of Object Literal does not exist");

    test.done();
  },
  
  "Extend Works": function (test) {
    var query = "|> this, { fullName: firstName + ' ' + lastName }";
    test.equal(objeq(this.data, query)[0].fullName, 'Thom Bradford',
      "Extended Field exists");
    
    test.equal(objeq(this.data, query)[0].lastName, 'Bradford',
      "Original Field exists");
    
    test.done();
  }
});
