var Intersection = require('./common/Intersection');
var Literal = require('./Literal');
var Or = require('./Or');
var PropertyIsEqualTo = require('./PropertyIsEqualTo');
var PropertyName = require('./PropertyName');

/**
 * The Filter and ElseFilter elements of a Rule allow the selection of features in rules to be controlled by attribute conditions. As discussed in the previous section, rule activation may also be controlled by the MinScaleDenominator and the MaxScaleDenominator elements as well as the map-rendering scale. The Filter element has a relatively straightforward meaning. The syntax of the Filter element is defined in the WFS specification and allows both attribute (property) and spatial filtering.
 * Example:
 * <ogc:Filter>
 * 	 <ogc:PropertyIsGreaterThanOrEqualTo>
 *     <ogc:PropertyName>num_lanes<ogc:PropertyName>
 *     <ogc:Literal>4</ogc:Literal>
 *   </ogc:PropertyIsGreaterThanOrEqualTo>
 * </ogc:Filter>
 *
 * @augments Intersection
 * @alias Filter
 * @param children
 * @constructor
 */
var Filter = function (children) {
	Intersection.call(this, "ogc:Filter", children);
};

Filter.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Filter.prototype.validChildren = function() {
	return ['ogc:PropertyIsEqualTo', 'ogc:PropertyIsNull', 'ogc:PropertyIsNotEqualTo', 'ogc:PropertyIsLessThan', 'ogc:PropertyIsLessThanOrEqualTo', 'ogc:PropertyIsGreaterThan', 'ogc:PropertyIsGreaterThanOrEqualTo', 'ogc:PropertyIsLike', 'ogc:PropertyIsBetween', 'ogc:And', 'ogc:Or'];
};

/**
 * It creates new Filter from valid description. In order for filter description to be valid. It must contain at least filterType as a parameter and then some value for given filterType.
 * @param filterDescription {Object} This object contains additional information relevant for filter.
 * @param filterDescription.attributeCsv {Object} It contains values for the relevant attribute.
 * @param filterDescription.attributeCsv.values {String} Values supplied as a , denominated String
 * @param filterAttributeKey {String} Id of the attribute to which the style should be applied
 * @param filterType {String} Type of the filter used to retrieve valid values.
 * @returns {Filter}
 */
Filter.fromDescription = function(filterDescription, filterAttributeKey, filterType){
	var properties = [];

	var relevantAttributeValues = filterDescription[filterType].values.split(',');
	relevantAttributeValues.forEach(function(value){
		properties.push(new PropertyIsEqualTo([
			new PropertyName(filterAttributeKey),
			new Literal(value)
		]));
	});

	return new Filter([
		new Or(properties)
	]);
};

module.exports = Filter;