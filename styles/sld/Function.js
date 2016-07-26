var Intersection = require('./common/Intersection');

/**
 * @augments Intersection
 * @alias Function
 * @constructor
 * @param children {Node[]} Children of this node.
 */
var Function = function(children) {
	Intersection.call(this, 'ogc:Function', children);
};

Function.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
Function.prototype.validChildren = function(){
	return ['ogc:Mul', 'ogc:Literal'];
};

module.exports = Function;

