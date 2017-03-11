const _ = require( "lodash" );
const Node = require( "./node" );

const rabbitDefaults = {};
const rabbitOptions = [
	"exclusive", "durable", "autoDelete", "arguments",
	"messageTtl", "expires", "maxLength", "maxPriority",
	"prefetch"
];
const embeddedOptions = [
	"name", "deadLetterExchange", "deadLetterRoutingKey", "patterns"
];

class Queue extends Node {
	constructor( key, opt = {} ) {
		super();
		this.key = key;
		this.name = opt.name || key;
		this.rabbitOpt = Object.assign( {}, rabbitDefaults, _.pick( opt, rabbitOptions ) );
		this.extended = _.omit( opt, rabbitOptions.concat( embeddedOptions ) );
	}

	deadLetter( node, routingKey ) {
		this.deadLetterExchange = { node, routingKey };
		return this;
	}
}

module.exports = Queue;
