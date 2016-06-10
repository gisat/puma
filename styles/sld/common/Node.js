/**
 * Every element in SLD tree is a node. This object represents all Nodes in the document.
 * @param name {String} Name of the node.
 * @constructor
 * @alias Node
 */
var Node = function (name) {
	this._name = name;
};

/**
 * To be overridden in all descendants.
 * It should generate valid xml representation of the current node. It should also take into account all the children if
 * necessary.
 */
Node.prototype.toXml = function () {
};

module.exports = Node;