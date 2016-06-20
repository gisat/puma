var Intersection = require('./common/Intersection');

/**
 * @augments Intersection
 * @alias Filter
 * @param children
 * @constructor
 */
var Filter = function (children) {
	Intersection.call(this, "ogc:Filter", children);
};

Filter.prototype = Object.create(Intersection.prototype);

module.exports = Filter;