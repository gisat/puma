var Leaf = require('./common/Leaf');

/**
 * It defines the range of map-rendering scales for which the rule should be applied.
 * The values used are actually the scale denominators relative to a “standardized rendering pixel size” (below). For example, an element-content value of “10000000” means a scale of 1:10-million. Scientific notation is also allowed here (and for all non-integer numbers in SLD), so a more convenient value of “10e6” could also be used for the element content for this example.
 * The MinScaleDenominator and MaxScaleDenominator elements, as their names suggest, are simply the minimum and maximum ranges of scale (denominators) of maps for which a rule should apply. The minimum scale is inclusive and the maximum scale is exclusive. So, for example, the following scale range:
 * @augments Leaf
 * @alias MaxScaleDenominator
 * @param value
 * @constructor
 */
var MaxScaleDenominator = function(value) {
	Leaf.call(this, 'sld:MaxScaleDenominator', value);
};

MaxScaleDenominator.prototype = Object.create(Leaf.prototype);

module.exports = MaxScaleDenominator;