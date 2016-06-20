var util = require('util');

var Node = require('./Node');

/**
 * It represents nodes with children nodes instead of the value.
 * @param name {String} Name of the current node.
 * @param children {Node[]} Children nodes
 * @constructor
 * @alias Intersection
 * @augments Node
 */
var Intersection = function (name, children) {
	Node.call(this, name);

	// In case user provides single value transform it into the array.
	if (children && !(children instanceof Array)) {
		children = [children];
	}
	this._children = children || [];
};

Intersection.prototype = Object.create(Node.prototype);

/**
 * @inheritDoc
 */
Intersection.prototype.toXml = function () {
	var value = "";
	this._children.forEach(function (node) {
		value += node.toXml();
	});

	return util.format('<%s>%s</%s>', this._name, value, this._name);
};

module.exports = Intersection;