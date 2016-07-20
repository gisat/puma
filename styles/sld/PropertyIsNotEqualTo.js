var Intersection = require('./common/Intersection');

/**
 *
 * @alias PropertyIsNotEqualTo
 * @param children
 * @constructor
 * @augments Intersection
 */
var PropertyIsNotEqualTo = function(children) {
	Intersection.call(this, "ogc:PropertyIsNotEqualTo", children);
};

PropertyIsNotEqualTo.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
PropertyIsNotEqualTo.prototype.validChildren = function() {
	return ['ogc:PropertyName','ogc:Literal'];
};

module.exports = PropertyIsNotEqualTo;