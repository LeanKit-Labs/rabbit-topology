class Node {
	accept( visitor ) {
		visitor.visit( this );
	}
}

module.exports = Node;
