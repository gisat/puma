var Intersection = require('./common/Intersection');

var Filter = require('./Filter');
var PolygonSymbolizer = require('./PolygonSymbolizer');
var Name = require('./Name');
var Title = require('./Title');

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
 * @param ruleDescription {Object}
 * @param ruleDescription.name {String} Name of the rule
 * @param ruleDescription.title {String} Title of the Rule
 * @param ruleDescription.appearance {Object}
 * @param ruleDescription.appearance.fillColour {String} String representing color, which should be used to fill the geometry.
 * @param ruleDescription.filter {Object}
 * @param ruleDescription.filter.attributeCsv {Object} It contains values for the relevant attribute.
 * @param ruleDescription.filter.attributeCsv.values {String} Values supplied as a , denominated String
 * @param type {String} Type representation of the symbolizer. Currently supported is only 'polygon'
 * @param filterAttributeKey {String} Filter id of attributeset, PropertyName
 * @param filterAttributeSetKey {String} Id of attributeset which contains attributes for rules.
 * @param filterType {String} Name for the attribute in ruleDescription  which contains comma separated values representing values of the attribute.
 */
Rule.fromObjectDescription = function(ruleDescription, type, filterAttributeKey, filterAttributeSetKey, filterType) {
	var symbolizer;

	if(type == 'polygon') {
		symbolizer = PolygonSymbolizer;
	}

	return new Rule([
		new Name(ruleDescription.name),
		new Title(ruleDescription.title),
		Filter.fromDescription(ruleDescription.filter, filterAttributeKey, filterType),
		symbolizer.fromDescription(ruleDescription.appearance)
	]);
};

module.exports = Rule;