/**
 * Every element in SLD tree is a node. This object represents all Nodes in the document.
 * @param name {String} Name of the node.
 * @param attributes {Object[]} Name of the attribute paired up with a value.
 * @constructor
 * @alias Node
 */
var Node = function (name, attributes) {
	this._name = name;
	this._attributes = attributes || [];
};

Object.defineProperties(Node.prototype, {
	name: {
		get: function(){
			return this._name;
		}
	},

	attributes: {
		get: function(){
			return this._attributes;
		}
	}
});

/**
 * To be overridden in all descendants.
 * It should generate valid xml representation of the current node. It should also take into account all the children if
 * necessary.
 */
Node.prototype.toXml = function () {
};

/**
 * Tests whether it is the same type of node.
 * @param name {String}
 * @returns boolean
 */
Node.prototype.is = function(name) {
	return this._name == name;
};

module.exports = Node;