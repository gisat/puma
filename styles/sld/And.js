var Intersection = require('./common/Intersection');

/**
 * And in the Styled layer description document.
 * @param children {Node[]} Children nodes
 * @constructor
 * @augments Intersection
 * @alias And
 */
var And = function (children) {
	Intersection.call(this, "ogc:And", children);
};

And.prototype = Object.create(Intersection.prototype);

And.prototype.validChildren = function() {
	return ['ogc:PropertyIsEqualTo', 'ogc:PropertyIsNull', 'ogc:PropertyIsNotEqualTo', 'ogc:PropertyIsLessThan', 'ogc:PropertyIsLessThanOrEqualTo', 'ogc:PropertyIsGreaterThan', 'ogc:PropertyIsGreaterThanOrEqualTo', 'ogc:PropertyIsLike', 'ogc:PropertyIsBetween', 'ogc:And', 'ogc:Or'];
};

module.exports = And;