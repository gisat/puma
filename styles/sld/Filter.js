let And = require('./And');
let Intersection = require('./common/Intersection');
let Literal = require('./Literal');
let Or = require('./Or');
let PropertyIsEqualTo = require('./PropertyIsEqualTo');
let PropertyIsGreaterThan = require('./PropertyIsGreaterThan');
let PropertyIsLessThan = require('./PropertyIsLessThan');
let PropertyName = require('./PropertyName');

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
 * @param filterDescription {Object} This object contains additional information relevant for filter. Int support filterCsv as well as filterInterval.
 * @param filterAttributeKey {String} Id of the attribute to which the style should be applied
 * @param filterType {String} Type of the filter used to retrieve valid values.
 * @returns {Filter}
 */
Filter.fromDescription = function(filterDescription, filterAttributeKey, filterType){
	let properties = [];

	if(filterType == "attributeCsv") {
        let relevantAttributeValues = filterDescription[filterType].values.split(',');
        relevantAttributeValues.forEach(function (value) {
            properties.push(new PropertyIsEqualTo([
                new PropertyName(filterAttributeKey),
                new Literal(value)
            ]));
        });

        return new Filter([
            new Or(properties)
        ]);
    } else if(filterType == "attributeInterval") {
        let intervalStart = filterDescription[filterType].intervalStart;
        let intervalEnd = filterDescription[filterType].intervalEnd;

        properties.push(new PropertyIsGreaterThan([
            new PropertyName(filterAttributeKey),
            new Literal(intervalStart)
        ]));

        properties.push(new PropertyIsLessThan([
            new PropertyName(filterAttributeKey),
            new Literal(intervalEnd)
        ]));

        return new Filter([
            new And(properties)
        ]);
	}
};

module.exports = Filter;