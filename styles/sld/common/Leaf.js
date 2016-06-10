var util = require('util');

var Node = require('./Node');

/**
 * It represents leaf node in the document. This node doesn't have anymore children.
 * @alias Leaf
 * @constructor
 * @augments Node
 * @params name {String} Name of the current node.
 * @params value {String} Value
 */
var Leaf = function (name, value) {
	Node.call(this, name);

	this._value = value;
};

Leaf.prototype = Object.create(Node.prototype);

/**
 * @inheritDoc
 */
Leaf.prototype.toXml = function () {
	return util.format('<%s>%s</%s>', this._name, this._value, this._name);
};

module.exports = Leaf;