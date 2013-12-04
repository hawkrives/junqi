var parser = require('../../junqi/parser.js').createParser();
var util = require('util');
console.log(
	util.inspect(
		parser.parse('jsoniq','let $ghosts:=collection("ghosts") for $ghost in $ghosts group by $ghost.father return { name: $ghost.name }'),
		{
			colors:true,
			depth:null
		}
	)
);