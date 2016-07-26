var Intersection = require('./common/Intersection');

/**
 * It represents on CssParameter to be applied.
 * @alias CssParameter
 * @param children {Node[]} Children nodes.
 * @constructor
 * @augments Intersection
 */
var Mul = function (children) {
	Intersection.call(this, "ogc:Mul", children);
};

Mul.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Mul.prototype.validChildren = function(){
	return ['ogc:PropertyName','ogc:Literal'];
};

module.exports = Mul;