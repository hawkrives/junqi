var nodeunit = require('nodeunit')
  , util = require('util')
  , junqi = require('../../junqi')
  , parserModule = require('../../junqi/parser');

exports.parse = nodeunit.testCase({
  setUp: function (callback) {
    callback();
  },

  "JSONiq Parser Works": function (test) {
    var query = 'let $ghosts := collection("ghosts") ' +
                'for $ghost in $ghosts ' +
                'group by $ghost.father ' +
                'return { name: $ghost.name }';

    var parser = parserModule.createParser(junqi.createJunqiEnvironment())
      , parseTree = parser.parse('jsoniq', query);

    console.log(util.inspect(parseTree, { colors: true, depth: null}));

    test.done();
  }
});
