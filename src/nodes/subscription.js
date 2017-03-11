const Node = require( "./node" );

class Subscription extends Node {
	constructor( bindingNode ) {
		super();
		this.bindingNode = bindingNode;
	}
}

module.exports = Subscription;
