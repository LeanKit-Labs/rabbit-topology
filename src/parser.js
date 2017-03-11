/* eslint-disable max-lines */
const _ = require( "lodash" );
const nodes = require( "./nodes" );

function checkArray( val ) {
	return _.isNil( val ) || _.isArray( val );
}

function checkObject( val ) {
	return _.isNil( val ) || _.isObject( val );
}

const api = {
	referenceNode( key ) {
		return new nodes.Reference( key );
	},
	queueBindingNode( exchangeNode, targetNode, patterns ) {
		return new nodes.Binding( exchangeNode, targetNode, patterns, "queue" );
	},
	exchangeBindingNode( exchangeNode, targetNode, patterns ) {
		return new nodes.Binding( exchangeNode, targetNode, patterns, "exchange" );
	},
	subscriptionNode( key, opt, targetNode ) {
		const exchangeNode = _.isPlainObject( opt ) ?
			api.exchangeNode( key, _.omit( opt, "patterns" ) ) :
			api.referenceNode( key );
		const patterns = _.isArray( opt ) ? opt : opt.patterns;
		const bindingNode = api.exchangeBindingNode( exchangeNode, targetNode, patterns );
		return new nodes.Subscription( bindingNode );
	},
	queueNode( key, opt ) {
		const queue = new nodes.Queue( key, opt );
		if ( !_.isEmpty( opt.deadLetterExchange ) ) {
			const ref = _.isPlainObject( opt.deadLetterExchange ) ?
				api.exchangeNode( opt.deadLetterExchange.name, opt.deadLetterExchange ) :
				api.referenceNode( opt.deadLetterExchange );
			queue.deadLetter( ref, opt.deadLetterRoutingKey );
		}
		return queue;
	},
	exchangeNode( key, opt ) {
		const exchange = new nodes.Exchange( key, opt );
		if ( !_.isEmpty( opt.alternateExchange ) ) {
			const ref = _.isPlainObject( opt.alternateExchange ) ?
				api.exchangeNode( opt.alternateExchange.name, opt.alternateExchange ) :
				api.referenceNode( opt.alternateExchange );
			exchange.alternate( ref );
		}

		if ( _.isPlainObject( opt.queues ) ) {
			_.forEach( opt.queues, ( v, k ) => {
				const isEmbedded = _.isPlainObject( v );
				const target = isEmbedded ? api.queueNode( k, v ) : api.referenceNode( k );
				const patterns = isEmbedded ? v.patterns : v;
				exchange.bindQueue( api.queueBindingNode( exchange, target, patterns ) );
			} );
		}

		if ( _.isPlainObject( opt.exchanges ) ) {
			_.forEach( opt.exchanges, ( v, k ) => {
				const isEmbedded = _.isPlainObject( v );
				const target = isEmbedded ? api.exchangeNode( k, v ) : api.referenceNode( k );
				const patterns = isEmbedded ? v.patterns : v;
				exchange.bindExchange( api.exchangeBindingNode( exchange, target, patterns ) );
			} );
		}

		if ( _.isPlainObject( opt.subscriptions ) ) {
			_.forEach( opt.subscriptions, ( v, k ) => exchange.subscribe( api.subscriptionNode( k, v, exchange ) ) );
		}

		return exchange;
	}
};

// Build an AST from the domain language representation
module.exports = ( dsl ) => {
	checkObject( dsl.exchanges, "The 'exchanges' root definition must be a map" );
	checkObject( dsl.queues, "The 'queues' root definition must be a map" );
	checkArray( dsl.bindings, "The 'bindings' root definition must be an array" );

	const root = [];
	_.forEach( dsl.exchanges, ( val, key ) => root.push( api.exchangeNode( key, val ) ) );
	_.forEach( dsl.queues, ( val, key ) => root.push( api.queueNode( key, val ) ) );
	_.forEach( dsl.bindings, ( val, key ) => {
		// We don't know if it's an exchange or queue binding from here.
		// So, we will need to look it up when traversing the AST.
		const binding = new nodes.Binding(
			new nodes.Reference( val.exchange ),
			new nodes.Reference( val.target ),
			val.patterns
		);
		root.push( binding );
	} );
	return root;
};
