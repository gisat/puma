var Intersection = require('./common/Intersection');

/**
 * @augments Intersection
 * @alias UserStyle
 * @param children
 * @constructor
 */
var UserStyle = function (children) {
	Intersection.call(this, "", children);
};

UserStyle.prototype = Object.create(Intersection.prototype);

module.exports = UserStyle;