var Intersection = require('./common/Intersection');

/**
 * @alias Rule
 * @augments Intersection
 * @param children
 * @constructor
 */
var Rule = function (children) {
	Intersection.call(this, "sld:Rule", children);
};

Rule.prototype = Object.create(Intersection.prototype);

module.exports = Rule;