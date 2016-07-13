var Intersection = require('./common/Intersection');

/**
 * Represents Not for certain elements.
 * @alias Not
 * @constructor
 * @augments Intersection
 */
var Not = function(children) {
	Intersection.call(this, 'ogc:Not', children);
};

Not.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Not.prototype.validChildren = function(){
	return ['ogc:PropertyIsEqualTo', 'ogc:PropertyIsNull', 'ogc:PropertyIsNotEqualTo', 'ogc:PropertyIsLessThan', 'ogc:PropertyIsLessThanOrEqualTo', 'ogc:PropertyIsGreaterThan', 'ogc:PropertyIsGreaterThanOrEqualTo', 'ogc:PropertyIsLike', 'ogc:PropertyIsBetween', 'ogc:And', 'ogc:Or'];
};

module.exports = Not;