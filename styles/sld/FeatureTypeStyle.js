var Intersection = require('./common/Intersection');

/**
 * @alias FeatureTypeStyle
 * @param children {Node[]} Children nodes.
 * @constructor
 * @augments Intersection
 */
var FeatureTypeStyle = function (children) {
	Intersection.call(this, "sld:FeatureTypeStyle", children);
};

FeatureTypeStyle.prototype = Object.create(Intersection.prototype);

module.exports = FeatureTypeStyle;