var Intersection = require('./common/Intersection');

/**
 * @alias PropertyIsNull
 * @augments Intersection
 * @param children {Node[]}
 * @constructor
 */
var PropertyIsNull = function(children) {
	Intersection.call(this, 'ogc:PropertyIsNull', children);
};

PropertyIsNull.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
PropertyIsNull.prototype.validChildren = function(){
	return ['ogc:PropertyName'];
};

module.exports = PropertyIsNull;