var Intersection = require('./common/Intersection');

var Filter = require('./Filter');
var PolygonSymbolizer = require('./PolygonSymbolizer');

/**
 * Rules are used to group rendering instructions by feature-property conditions and map scales. Rule definitions are placed immediately inside of feature-style definitions
 * The Title and Abstract elements give the familiar short title for display lists and longer description for the rule. Rules will typically be equated with different symbol appearances in a map legend, so it is useful to have at least the Title so it can be displayed in a legend. The Name element allows the rule to be referenced externally, which is needed in some methods of SLD usage.
 * @alias Rule
 * @augments Intersection
 * @param children
 * @constructor
 */
var Rule = function (children) {
	Intersection.call(this, "sld:Rule", children);
};

Rule.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Rule.prototype.validChildren = function() {
	return ['sld:Name','sld:Title','sld:Abstract','sld:LegendGraphic','ogc:Filter','sld:ElseFilter','sld:minScaleDenominator','sld:maxScaleDenominator','sld:LineSymbolizer','sld:PolygonSymbolizer', 'sld:PointSymbolizer', 'sld:TextSymbolizer', 'sld:RasterSymbolizer'];
};

/**
 * It turns object description in valid SLD rule.
 * @param ruleDescription
 */
Rule.fromObjectDescription = function(ruleDescription, type, filterAttributeKey, filterAttributeSetKey, filterType) {
	var symbolizer;

	if(type == 'polygon') {
		symbolizer = PolygonSymbolizer;
	}

	return new Rule([
		Filter.fromDescription(ruleDescription.filter, filterAttributeKey, filterType),
		symbolizer.fromDescription(ruleDescription.appearance, filterAttributeKey)
	]);
};

module.exports = Rule;