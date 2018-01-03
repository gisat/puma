var Intersection = require('./common/Intersection');

/**
 * The FeatureTypeStyle defines the styling that is to be applied to a single feature type of a layer. This element may also be externally re-used outside of the scope of WMSes and layers.
 * The Name element does not have an explicit use at present, though it conceivably might be used to reference a feature style in some feature-style library.
 * The Title and Abstract are for human-readable information
 * @alias FeatureTypeStyle
 * @param children {Node[]} Children nodes.
 * @constructor
 * @augments Intersection
 */
var FeatureTypeStyle = function (children) {
	Intersection.call(this, "sld:FeatureTypeStyle", children);
};

FeatureTypeStyle.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
FeatureTypeStyle.prototype.validChildren = function(){
	return ['sld:Name','sld:Title','sld:Abstract','sld:FeatureTypeName','sld:SemanticTypeIdentifier','sld:Rule'];
};

module.exports = FeatureTypeStyle;