var Leaf = require('./common/Leaf');
var Attribute = require('./common/Attribute');

/**
 * It represents on CssParameter to be applied.
 * @alias CssParameter
 * @param value {String} Hex representation of color.
 * @param attributes {Attribute[]} Collection of Attributes, which should be part of the Leaf Element.
 * @constructor
 * @augments Intersection
 */
var CssParameter = function (value, attributes) {
	Leaf.call(this, "sld:CssParameter", value, attributes);
};

CssParameter.prototype = Object.create(Leaf.prototype);

/**
 * @param appearance {Object}
 * @param appearance.fillColour {String} String representing color, which should be used to fill the geometry.
 * @returns {CssParameter}
 */
CssParameter.fromDescription = function(appearance) {
	var name = new Attribute('name', 'fill'); // So far the only option supported.

	return new CssParameter(appearance.fillColour, [name]);
};

module.exports = CssParameter;