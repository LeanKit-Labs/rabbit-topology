/* eslint-disable max-lines */
const _ = require( "lodash" );

const queueOptions = [
	"exclusive", "durable", "autoDelete", "arguments",
	"messageTtl", "expires", "maxLength", "maxPriority",
	"prefetch"
];
const exchangeOptions = [
	"durable", "internal", "autoDelete", "arguments"
];

module.exports = ( definition ) => {
	const exchanges = {};
	const queues = {};
	const bindings = { queues: [], exchanges: [] };
	const api = {
		ensureQueue( name, def ) {
			if ( queues[ name ] ) {
				return;
			}
			const queue = Object.assign( { name: ( def.name || name ) }, _.pick( def, queueOptions ) );
			if ( !_.isEmpty( def.deadLetterExchange ) ) {
				const dlx = def.deadLetterExchange;
				if ( _.isString( dlx ) ) {
					queue.deadLetterExchange = dlx;
					queue.deadLetterRoutingKey = def.deadLetterRoutingKey;
				} else {
					api.ensureExchange( dlx.name, dlx );
					queue.deadLetterExchange = dlx.name;
					queue.deadLetterRoutingKey = dlx.routingKey;
				}
			}
			queues[ name ] = queue;
		},
		ensureExchange( name, def ) {
			if ( exchanges[ name ] ) {
				return;
			}

			const exchange = Object.assign( { name: ( def.name || name ), type: def.type }, _.pick( def, exchangeOptions ) );
			if ( !_.isEmpty( def.alternateExchange ) ) {
				const altx = def.alternateExchange;
				if ( _.isString( altx ) ) {
					exchange.alternateExchange = altx;
				} else {
					api.ensureExchange( altx.name, altx );
					exchange.alternateExchange = altx.name;
				}
			}

			const convertBinding = ( defn, key ) => {
				// Conforming to: { exchange: <string>, target: <object>, patterns: <array> }
				let target;
				if ( _.isString( defn ) ) {
					target = { name: defn };
				} else {
					target = Object.assign( { name: ( defn.name || key ) }, _.omit( defn, "patterns" ) );
				}
				return { exchange: exchange.name, target, patterns: defn.patterns || [ "" ] };
			};

			_.forEach( _.get( def, "bindings.queues", {} ), ( value, key ) => {
				const binding = convertBinding( value, key );
				api.ensureBinding( "queue", key, binding );
			} );

			_.forEach( _.get( def, "bindings.exchanges", {} ), ( value, key ) => {
				const binding = convertBinding( value, key );
				api.ensureBinding( "exchange", key, binding );
			} );

			exchanges[ name ] = exchange;
		},
		ensureBinding( type, name, def ) {
			def = Object.assign( { patterns: [ "" ] }, def );

			let target = def.target;
			if ( _.isObject( def.target ) ) {
				const methodName = `ensure${ _.upperFirst( type ) }`;
				api[ methodName ]( name, def.target );
				target = target.name;
			}

			def.patterns.forEach( pattern => {
				bindings[ `${ type }s` ].push( { exchange: def.exchange, target, pattern } );
			} );
		}
	};

	_.forEach( definition.exchanges, ( def, exchangeName ) => {
		api.ensureExchange( exchangeName, def );
	} );

	_.forEach( definition.queues, ( def, queueName ) => {
		api.ensureQueue( queueName, def );
	} );

	_.forEach( definition.bindings, def => {
		// If we're creating bindings at the root definition level, we need
		// to use the target name to determine if the target is a queue or exchange.
		const targetQueue = queues[ def.target ];
		if ( !_.isNil( targetQueue ) ) {
			api.ensureBinding( "queue", def.target, def );
		} else {
			api.ensureBinding( "exchange", def.target, def );
		}
	} );

	return { exchanges, queues, bindings };
};
