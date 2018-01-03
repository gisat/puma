var util = require('util');

var Node = require('./Node');

/**
 * It represents leaf node in the document. This node doesn't have anymore children.
 * @alias Leaf
 * @constructor
 * @augments Node
 * @params name {String} Name of the current node.
 * @params value {String} Value
 * @params attributes {Attribute[]}
 */
var Leaf = function (name, value, attributes) {
	Node.call(this, name, attributes);

	this._value = value;
	this._attributes = attributes || [];
};

Leaf.prototype = Object.create(Node.prototype);

/**
 * @inheritDoc
 */
Leaf.prototype.toXml = function () {
	var attributeValues = '';
	this._attributes.forEach(function(attribute){
		attributeValues += ' ' + attribute.toXml();
	});

	return util.format('<%s%s>%s</%s>', this._name, attributeValues, this._value, this._name);
};

module.exports = Leaf;