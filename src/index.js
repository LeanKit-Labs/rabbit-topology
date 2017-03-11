const parse = require( "./parser" );
const TopologyVisitor = require( "./visitors/topologyBuilder" );

module.exports = {
	parse( dsl ) {
		const ast = parse( dsl );
		const visitor = new TopologyVisitor();
		visitor.visit( ast );
		return visitor.topology;
	}
};
