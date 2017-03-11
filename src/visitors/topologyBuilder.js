/* eslint-disable max-lines */
const _ = require( "lodash" );

const matchNodeName = ( node ) => ( n ) => n.name === node.name;
const matchNodeEquality = ( node ) => ( n ) => _.isEqual( n, node );

function isUnique( arr, node, matcher = matchNodeName ) {
	const found = _.find( arr, matcher( node ) );
	if ( _.isPlainObject( arr ) ) {
		return !found && !arr[ node.key ];
	}
	return !found;
}

class TopologyVisitor {
	constructor() {
		this.topology = {
			exchanges: {},
			queues: {},
			bindings: {
				exchanges: [],
				queues: []
			}
		};
	}

	visit( node ) {
		if ( _.isArray( node ) ) {
			node.forEach( n => n.accept( this ) );
		} else {
			const fn = this[ `visit${ node.constructor.name }` ];
			if ( fn ) {
				( fn.bind( this ) )( node );
			}
		}
	}

	visitExchange( node ) {
		if ( !isUnique( this.topology.exchanges, node ) ) {
			return;
		}

		const exchange = { name: node.name, type: node.type, ...node.rabbitOpt };
		if ( !_.isEmpty( node.extended ) ) {
			exchange.arguments = Object.assign( {}, exchange.arguments, node.extended );
		}
		this.topology.exchanges[ node.key ] = exchange;

		// Alternate Exchanges
		if ( node.alternateExchange ) {
			exchange.alternateExchange = node.alternateExchange.name;
			node.alternateExchange.accept( this );
		}

		_.forEach( node.queueBindings, ( bindingNode, key ) => {
			bindingNode.accept( this );
		} );
		_.forEach( node.exchangeBindings, ( bindingNode, key ) => {
			bindingNode.accept( this );
		} );
		_.forEach( node.subscriptions, ( subNode, key ) => {
			subNode.accept( this );
		} );
	}

	visitQueue( node ) {
		if ( !isUnique( this.topology.queues, node ) ) {
			return;
		}

		const queue = { name: node.name, ...node.rabbitOpt };
		if ( !_.isEmpty( node.extended ) ) {
			queue.arguments = Object.assign( {}, queue.arguments, node.extended );
		}
		this.topology.queues[ node.key ] = queue;

		// Dead Letter
		if ( node.deadLetterExchange ) {
			queue.deadLetterExchange = node.deadLetterExchange.node.name;
			queue.deadLetterRoutingKey = node.deadLetterExchange.routingKey;
			node.deadLetterExchange.node.accept( this );
		}
	}

	visitSubscription( node ) {
		node.bindingNode.accept( this );
	}

	visitBinding( node ) {
		const exchange = node.exchangeNode.name;
		const target = node.targetNode.name;
		let type = node.type;
		if ( !type ) {
			if ( _.find( this.topology.queues, matchNodeName( node.targetNode ) ) ) {
				type = "queue";
			} else if ( _.find( this.topology.exchanges, matchNodeName( node.targetNode ) ) ) {
				type = "exchange";
			} else {
				throw new Error( "Unable to determine the binding type based on the queues / exchanges currently defined" );
			}
		}

		const arr = this.topology.bindings[ `${ type }s` ];
		node.patterns.forEach( pattern => {
			const binding = { exchange, target, pattern };
			if ( isUnique( arr, binding, matchNodeEquality ) ) {
				arr.push( binding );
			}
		} );

		node.exchangeNode.accept( this );
		node.targetNode.accept( this );
	}
}

module.exports = TopologyVisitor;
