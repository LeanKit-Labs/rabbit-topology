const Node = require( "./node" );

class Binding extends Node {
	constructor( exchangeNode, targetNode, patterns, type ) {
		super();
		this.exchangeNode = exchangeNode;
		this.targetNode = targetNode;
		this.patterns = patterns || [ "" ];
		this.type = type;
	}
}

module.exports = Binding;
