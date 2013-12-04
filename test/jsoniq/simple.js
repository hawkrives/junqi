var parser = require('../../junqi/parser.js').createParser();
var util = require('util');
console.log(
	util.inspect(
		parser.parse('jsoniq',"let $t := [1,4] return { gos:$t }"),
		{
			colors:true,
			depth:null
		}
	)
);