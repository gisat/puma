var Intersection = require('./common/Intersection');

/**
 * @augments Intersection
 * @alias Function
 * @constructor
 */
var Function = function() {
	Intersection.call(this, 'ogc:Function', )
};

Function.prototype = Object.create(Intersection.prototype);

