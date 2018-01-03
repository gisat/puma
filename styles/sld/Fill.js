var Intersection = require('./common/Intersection');
var CssParameter = require('./CssParameter');

/**
 * @alias Fill
 * @augments Intersection
 * @param children
 * @constructor
 */
var Fill = function(children) {
	Intersection.call(this, 'sld:Fill', children);
};

Fill.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Fill.prototype.validChildren = function() {
	return ['sld:GraphicFill', 'sld:CssParameter'];
};

/**
 * @param appearance {Object}
 * @param appearance.fillColour {String} String representing color, which should be used to fill the geometry.
 * @returns {Fill}
 */
Fill.fromDescription = function(appearance) {
	return new Fill([
		CssParameter.fromDescription(appearance)
	]);
};

module.exports = Fill;