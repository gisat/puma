var Intersection = require('./common/Intersection');

/**
 * @alias Fill
 * @augments Intersection
 * @param children
 * @constructor
 */
var Fill = function(children) {
	Intersection.call(this, 'sld:Fill', children);
};

Fill.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Fill.prototype.validChildren = function() {
	return ['sld:GraphicFill', 'sld:CssParameter'];
};

module.exports = Fill;