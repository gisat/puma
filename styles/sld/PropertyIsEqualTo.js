var Intersection = require('./common/Intersection');

/**
 * @alias PropertyIsEqualTo
 * @augments Leaf
 * @param children {Node[]}
 * @constructor
 */
var PropertyIsEqualTo = function (children) {
	Intersection.call(this, "ogc:PropertyIsEqualTo", children);
};

PropertyIsEqualTo.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
PropertyIsEqualTo.prototype.validChildren = function() {
	return ['ogc:PropertyName','ogc:Literal'];
};

module.exports = PropertyIsEqualTo;