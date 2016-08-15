var Intersection = require('./common/Intersection');

var CssParameter = require('./CssParameter');

/**
 *
 * @alias Stroke
 * @augments Intersection
 * @param children
 * @constructor
 */
var Stroke = function (children) {
	Intersection.call(this, "sld:Stroke", children);
};

Stroke.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Stroke.prototype.validChildren = function() {
	return ['sld:CssParameter'];
};

/**
 * It turns object description in valid SLD stroke.
 */
Stroke.fromObjectDescription = function() {
	return new Stroke([

	]);
};

module.exports = Stroke;