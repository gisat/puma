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

module.exports = PropertyIsEqualTo;