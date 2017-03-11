/* eslint-disable max-lines, no-magic-numbers */
/* eslint-env mocha */
const nodes = require( "../nodes" );
const TopologyVisitor = require( "./topologyBuilder" );
const { assert } = testHelpers;

describe( "Visitors - Topology Builder", () => {
	let visitor;

	beforeEach( () => {
		visitor = new TopologyVisitor();
	} );

	context( "exchange nodes", () => {
		it( "should only include the same exchange once in the topology", () => {
			visitor.visit( [
				new nodes.Exchange( "minimal", { name: "minimal-1", type: "topic" } ),
				new nodes.Exchange( "minimal", { name: "minimal-2", type: "fanout" } )
			] );
			assert.deepEqual( visitor.topology.exchanges, {
				minimal: {
					name: "minimal-1",
					type: "topic"
				}
			} );
		} );

		it( "should build the correct topology", () => {
			visitor.visit(
				new nodes.Exchange( "minimal", {
					type: "fanout",
					name: "minimal-ex",
					durable: true,
					internal: true,
					autoDelete: true,
					canonical: true,
					arguments: { custom: "value" }
				} )
			);
			assert.deepEqual( visitor.topology.exchanges, {
				minimal: {
					name: "minimal-ex",
					type: "fanout",
					durable: true,
					internal: true,
					autoDelete: true,
					arguments: { custom: "value", canonical: true }
				}
			} );
		} );

		context( "alternate exchanges", () => {
			it( "should add alternate exchanges when defined as exchanges", () => {
				visitor.visit(
					new nodes.Exchange( "minimal", {} )
						.alternate( new nodes.Exchange( "alternate", {} ) )
				);
				assert.deepEqual( visitor.topology.exchanges, {
					alternate: {
						name: "alternate",
						type: "fanout"
					},
					minimal: {
						name: "minimal",
						type: "fanout",
						alternateExchange: "alternate"
					}
				} );
			} );

			it( "should not add alternate exchanges when defined as reference nodes", () => {
				visitor.visit(
					new nodes.Exchange( "minimal", {} )
						.alternate( new nodes.Reference( "alternate" ) )
				);
				assert.deepEqual( visitor.topology.exchanges, {
					minimal: {
						name: "minimal",
						type: "fanout",
						alternateExchange: "alternate"
					}
				} );
			} );
		} );

		context( "embedded bindings", () => {
			it( "should build the correct topology when binding exchanges", () => {
				visitor.visit(
					new nodes.Exchange( "x" )
						.bindExchange( new nodes.Binding(
							new nodes.Reference( "x" ),
							new nodes.Exchange( "sub.x" ),
							[ "#" ],
							"exchange"
						) )
				);
				assert.deepEqual( visitor.topology, {
					exchanges: {
						x: { name: "x", type: "fanout" },
						"sub.x": { name: "sub.x", type: "fanout" }
					},
					queues: {},
					bindings: {
						queues: [],
						exchanges: [ {
							exchange: "x",
							target: "sub.x",
							pattern: "#"
						} ]
					}
				} );
			} );

			it( "should build the correct topology when binding queues", () => {
				visitor.visit(
					new nodes.Exchange( "x" )
						.bindQueue( new nodes.Binding(
							new nodes.Reference( "x" ),
							new nodes.Queue( "q" ),
							[ "#" ],
							"queue"
						) )
				);
				assert.deepEqual( visitor.topology, {
					exchanges: {
						x: { name: "x", type: "fanout" }
					},
					queues: {
						q: { name: "q" }
					},
					bindings: {
						queues: [ {
							exchange: "x",
							target: "q",
							pattern: "#"
						} ],
						exchanges: []
					}
				} );
			} );

			it( "should build the correct topology when binding subscriptions", () => {
				visitor.visit(
					new nodes.Exchange( "x" )
						.subscribe( new nodes.Subscription(
							new nodes.Binding(
								new nodes.Reference( "x" ),
								new nodes.Queue( "q" ),
								[ "#" ],
								"exchange"
							)
						) )
				);
				assert.deepEqual( visitor.topology, {
					exchanges: {
						x: { name: "x", type: "fanout" }
					},
					queues: {
						q: { name: "q" }
					},
					bindings: {
						queues: [],
						exchanges: [ {
							exchange: "x",
							target: "q",
							pattern: "#"
						} ]
					}
				} );
			} );
		} );
	} );

	context( "queue nodes", () => {
		it( "should only include the same queue once in the topology", () => {
			visitor.visit( [
				new nodes.Queue( "minimal", { name: "minimal-1" } ),
				new nodes.Queue( "minimal", { name: "minimal-2" } )
			] );
			assert.deepEqual( visitor.topology.queues, {
				minimal: { name: "minimal-1" }
			} );
		} );

		it( "should build the correct topology", () => {
			visitor.visit(
				new nodes.Queue( "minimal", {
					name: "minimal-q",
					durable: true,
					exclusive: true,
					autoDelete: true,
					messageTtl: 500,
					expires: 600,
					maxLength: 100,
					maxPriority: 1,
					canonical: true,
					arguments: { custom: "value" }
				} )
			);
			assert.deepEqual( visitor.topology.queues, {
				minimal: {
					name: "minimal-q",
					durable: true,
					exclusive: true,
					autoDelete: true,
					messageTtl: 500,
					expires: 600,
					maxLength: 100,
					maxPriority: 1,
					arguments: { custom: "value", canonical: true }
				}
			} );
		} );

		context( "dead-letter exchanges", () => {
			it( "should add dead-letter exchanges when defined as exchanges", () => {
				visitor.visit(
					new nodes.Queue( "minimal", {} )
						.deadLetter( new nodes.Exchange( "dlx", { name: "minimal.dlx" } ), "#" )
				);
				assert.deepEqual( visitor.topology.exchanges, {
					dlx: {
						name: "minimal.dlx",
						type: "fanout"
					}
				} );
				assert.deepEqual( visitor.topology.queues, {
					minimal: {
						name: "minimal",
						deadLetterExchange: "minimal.dlx",
						deadLetterRoutingKey: "#"
					}
				} );
			} );

			it( "should not add dead-letter exchanges when defined as a reference", () => {
				visitor.visit(
					new nodes.Queue( "minimal", {} )
						.deadLetter( new nodes.Reference( "minimal.dlx" ), "#" )
				);
				assert.deepEqual( visitor.topology.exchanges, {} );
				assert.deepEqual( visitor.topology.queues, {
					minimal: {
						name: "minimal",
						deadLetterExchange: "minimal.dlx",
						deadLetterRoutingKey: "#"
					}
				} );
			} );
		} );
	} );

	context( "subscription nodes", () => {
		it( "should build the correct topology when defined as references", () => {
			visitor.visit( new nodes.Subscription(
				new nodes.Binding(
					new nodes.Reference( "topic.exchange" ),
					new nodes.Reference( "subscription.exchange" ),
					[ "*.one", "*.two" ],
					"exchange"
				)
			) );
			assert.deepEqual( visitor.topology, {
				queues: {},
				exchanges: {},
				bindings: {
					queues: [],
					exchanges: [ {
						exchange: "topic.exchange",
						target: "subscription.exchange",
						pattern: "*.one"
					}, {
						exchange: "topic.exchange",
						target: "subscription.exchange",
						pattern: "*.two"
					} ]
				}
			} );
		} );

		it( "should build the correct topology when defined as embedded exchanges", () => {
			visitor.visit( new nodes.Subscription(
				new nodes.Binding(
					new nodes.Exchange( "topic", { type: "topic", name: "topic.x" } ),
					new nodes.Exchange( "sub", { type: "fanout", name: "sub.x" } ),
					[ "*.one", "*.two" ],
					"exchange"
				)
			) );
			assert.deepEqual( visitor.topology, {
				queues: {},
				exchanges: {
					topic: {
						type: "topic",
						name: "topic.x"
					},
					sub: {
						type: "fanout",
						name: "sub.x"
					}
				},
				bindings: {
					queues: [],
					exchanges: [ {
						exchange: "topic.x",
						target: "sub.x",
						pattern: "*.one"
					}, {
						exchange: "topic.x",
						target: "sub.x",
						pattern: "*.two"
					} ]
				}
			} );
		} );
	} );

	context( "binding nodes", () => {
		it( "should build the correct topology when defined as references", () => {
			visitor.visit( [
				new nodes.Binding(
					new nodes.Reference( "topic.exchange" ),
					new nodes.Reference( "subscription.exchange" ),
					[ "*.one", "*.two" ],
					"exchange"
				),
				new nodes.Binding(
					new nodes.Reference( "topic.exchange" ),
					new nodes.Reference( "queue" ),
					[ "*.one", "*.two" ],
					"queue"
				)
			] );
			assert.deepEqual( visitor.topology.bindings, {
				queues: [ {
					exchange: "topic.exchange",
					target: "queue",
					pattern: "*.one"
				}, {
					exchange: "topic.exchange",
					target: "queue",
					pattern: "*.two"
				} ],
				exchanges: [ {
					exchange: "topic.exchange",
					target: "subscription.exchange",
					pattern: "*.one"
				}, {
					exchange: "topic.exchange",
					target: "subscription.exchange",
					pattern: "*.two"
				} ]
			} );
		} );

		it( "should build the correct topology when defined embedded", () => {
			visitor.visit( [
				new nodes.Binding(
					new nodes.Exchange( "topic.exchange" ),
					new nodes.Exchange( "subscription.exchange" ),
					[ "*.one", "*.two" ],
					"exchange"
				),
				new nodes.Binding(
					new nodes.Exchange( "topic.exchange" ),
					new nodes.Queue( "queue" ),
					[ "*.one", "*.two" ],
					"queue"
				)
			] );
			assert.deepEqual( visitor.topology, {
				exchanges: {
					"topic.exchange": { type: "fanout", name: "topic.exchange" },
					"subscription.exchange": { type: "fanout", name: "subscription.exchange" }
				},
				queues: {
					queue: { name: "queue" }
				},
				bindings: {
					queues: [ {
						exchange: "topic.exchange",
						target: "queue",
						pattern: "*.one"
					}, {
						exchange: "topic.exchange",
						target: "queue",
						pattern: "*.two"
					} ],
					exchanges: [ {
						exchange: "topic.exchange",
						target: "subscription.exchange",
						pattern: "*.one"
					}, {
						exchange: "topic.exchange",
						target: "subscription.exchange",
						pattern: "*.two"
					} ]
				}
			} );
		} );
	} );
} );
