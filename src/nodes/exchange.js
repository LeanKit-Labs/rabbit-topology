const _ = require( "lodash" );
const Node = require( "./node" );

const rabbitDefaults = { type: "fanout" };
const rabbitOptions = [
	"type", "durable", "internal", "autoDelete", "arguments"
];
const embeddedOptions = [
	"name", "queues", "exchanges", "alternateExchange", "patterns", "subscriptions"
];

class Exchange extends Node {
	constructor( key, opt = {} ) {
		super();
		this.key = key;
		this.name = opt.name || key;

		this.rabbitOpt = Object.assign( {}, rabbitDefaults, _.pick( opt, rabbitOptions ) );
		this.extended = _.omit( opt, rabbitOptions.concat( embeddedOptions ) );

		this.queueBindings = [];
		this.exchangeBindings = [];
		this.subscriptions = [];
	}

	alternate( node ) {
		this.alternateExchange = node;
		return this;
	}

	bindQueue( binding ) {
		this.queueBindings.push( binding );
		return this;
	}

	bindExchange( binding ) {
		this.exchangeBindings.push( binding );
		return this;
	}

	subscribe( subscription ) {
		this.subscriptions.push( subscription );
		return this;
	}
}

module.exports = Exchange;
