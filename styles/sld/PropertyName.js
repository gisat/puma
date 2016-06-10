var Leaf = require('./common/Leaf');

/**
 * @augments Leaf
 * @alias PropertyName
 * @param value {String}
 * @constructor
 */
var PropertyName = function (value) {
	Leaf.call(this, 'ogc:PropertyName', value);
};

PropertyName.prototype = Object.create(Leaf.prototype);

module.exports = PropertyName;