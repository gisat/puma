var Intersection = require('./common/Intersection');

/**
 * @alias Or
 * @constructor
 * @augments Intersection
 */
var Or = function (children) {
	Intersection.call(this, "ogc:Or", children);
};

Or.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Or.prototype.validChildren = function() {
	return ['ogc:PropertyIsEqualTo', 'ogc:PropertyIsNull', 'ogc:PropertyIsNotEqualTo', 'ogc:PropertyIsLessThan', 'ogc:PropertyIsLessThanOrEqualTo', 'ogc:PropertyIsGreaterThan', 'ogc:PropertyIsGreaterThanOrEqualTo', 'ogc:PropertyIsLike', 'ogc:PropertyIsBetween', 'ogc:And', 'ogc:Or'];
};

module.exports = Or;