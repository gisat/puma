var Leaf = require('./common/Leaf');

/**
 * @augments Leaf
 * @alias Literal
 * @param value {String}
 * @constructor
 */
var Literal = function (value) {
	Leaf.call(this, "ogc:Literal", value);
};

Literal.prototype = Object.create(Leaf.prototype);

module.exports = Literal;