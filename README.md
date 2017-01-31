# `rabbit-topology`

[![NPM Version][npm-image]][npm-url]
[![Build][ci-image]][ci-url]
[![Coverage][coverage-image]][coverage-url]

	Initial release designed to generate a topology definition.
	Other libraries are used to assert the topology against a running server.

Produce a rabbit topology definition from a DSL.

## Domain-Specific Language

TODO:  Formally define the DSL

## Examples

### Publisher

```javascript
const definition = {
	exchanges: {
		"app.events": {
			type: "fanout",
			exchanges: {
				"app.events.topic": {
					type: "topic"
				}
			}
		}
	}
}
```

### Subscriber

```javascript
const definition = {
	exchanges: {
		"app.service": {
			type: "fanout",
			queues: {
				inbound: {
					name: "app.service.queue",
					durable: true,
					prefetch: 50,
					deadLetterExchange: {
						name: "app.service.dlx",
						type: "fanout",
						queues: {
							"ingress.dlq": { durable: true }
						}
					}
				}
			},
			subscriptions: {
				"app.events.topic": {
					type: "topic",
					patterns: [ "app.#" ]
				}
			}
		}
	}
};
const topology = parser.parse( definition );
console.log( topology.queues.inbound );  // "app.service.queue"
```

[npm-image]: https://badge.fury.io/js/rabbit-topology.svg
[npm-url]: https://npmjs.org/package/rabbit-topology
[ci-image]: https://travis-ci.org/Bunk/rabbit-topology.svg?branch=master
[ci-url]: https://travis-ci.org/Bunk/rabbit-topology
[coverage-image]: https://coveralls.io/repos/github/Bunk/rabbit-topology/badge.svg
[coverage-url]: https://coveralls.io/github/Bunk/rabbit-topology
