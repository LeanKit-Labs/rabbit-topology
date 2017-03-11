const Node = require( "./node" );

class Reference extends Node {
	constructor( name ) {
		super();
		this.name = name;
	}
}

module.exports = Reference;
