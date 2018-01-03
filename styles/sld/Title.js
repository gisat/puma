var Leaf = require('./common/Leaf');

/**
 * @augments Leaf
 * @alias Title
 * @param value
 * @constructor
 */
var Title = function (value) {
	Leaf.call(this, "sld:Title", value);
};

Title.prototype = Object.create(Leaf.prototype);

module.exports = Title;