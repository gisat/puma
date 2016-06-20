var Intersection = require('./common/Intersection');

/**
 * @augments Intersection
 * @alias NamedLayer
 * @param children
 * @constructor
 */
var NamedLayer = function (children) {
	Intersection.call(this, "sld:NamedLayer", children);
};

NamedLayer.prototype = Object.create(Intersection.prototype);

module.exports = NamedLayer;