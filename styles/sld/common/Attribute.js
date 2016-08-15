var util = require('util');

/**
 * It represents attribute, which can be appended to the Node.
 * @param name {String} Name of the current node.
 * @param value {String} Value of the current node.
 * @constructor
 * @alias Attribute
 */
var Attribute = function(name, value) {
	this._name = name;
	this._value = value;
};

Attribute.prototype.toXml = function() {
	return util.format('%s="%s"', this._name, this._value);
};

module.exports = Attribute;