var Intersection = require('./common/Intersection');

/**
 * It represents on CssParameter to be applied.
 * @alias CssParameter
 * @param children {Node[]} Children nodes.
 * @constructor
 * @augments Intersection
 */
var CssParameter = function (children, attributes) {
	Intersection.call(this, "sld:CssParameter", children, attributes);
};

CssParameter.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
CssParameter.prototype.validChildren = function(){
	return ['ogc:Literal'];
};

module.exports = CssParameter;