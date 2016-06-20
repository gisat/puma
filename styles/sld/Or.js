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

module.exports = Or;