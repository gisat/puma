var Leaf = require('./common/Leaf');

/**
 * @alias Name
 * @param value {String}
 * @augments Leaf
 * @constructor
 */
var Name = function (value) {
	Leaf.call(this, "sld:Name", value);
};

Name.prototype = Object.create(Leaf.prototype);

module.exports = Name;