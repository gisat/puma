var Leaf = require('./common/Leaf');

/**
 * It represents Name element. This element can be used as a part of multiple other elements to specify Name.
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