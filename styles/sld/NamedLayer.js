var Intersection = require('./common/Intersection');

/**
 * A “layer” is defined as a collection of features that can be potentially of various mixed
 feature types. A named layer is a layer that can be accessed from an OpenGIS Web
 Server using a well-known name.
 * @augments Intersection
 * @alias NamedLayer
 * @param children
 * @constructor
 */
var NamedLayer = function (children) {
	Intersection.call(this, "sld:NamedLayer", children);
};

NamedLayer.prototype = Object.create(Intersection.prototype);

NamedLayer.prototype.validChildren = function() {
	return ['sld:Name','sld:LayerFeatureConstraints', 'sld:NamedStyle', 'sld:UserStyle'];
};

module.exports = NamedLayer;