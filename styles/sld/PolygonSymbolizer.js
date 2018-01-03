var Intersection = require('./common/Intersection');
var Fill = require('./Fill');
var Stroke = require('./Stroke');

/**
 * @alias PolygonSymbolizer
 * @augments Intersection
 * @param children
 * @constructor
 */
var PolygonSymbolizer = function(children) {
	Intersection.call(this, "sld:PolygonSymbolizer", children);
};

PolygonSymbolizer.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
PolygonSymbolizer.prototype.validChildren = function(){
	return ['sld:Geometry', 'sld:Fill', 'sld:Stroke'];
};

/**
 * It generates PolygonSymbolizer from the description by the
 * @param appearance {Object}
 * @param appearance.fillColour {String} String representing color, which should be used to fill the geometry.
 * @returns {PolygonSymbolizer}
 */
PolygonSymbolizer.fromDescription = function(appearance) {
	return new PolygonSymbolizer([
		Fill.fromDescription(appearance)
	]);
};

module.exports = PolygonSymbolizer;