var Intersection = require('./common/Intersection');

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

PolygonSymbolizer.fromDescription = function(appearance, filterAttributeSetKey) {
	return new PolygonSymbolizer([

	]);
};

module.exports = PolygonSymbolizer;