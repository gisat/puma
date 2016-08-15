var Intersection = require('./common/Intersection');

/**
 * A user-defined style allows map styling to be defined externally from a system and to be
 passed around in an interoperable format.
 * A UserStyle is at the same semantic level as a NamedStyle used in the context of a
 WMS. In a sense, a named style can be thought of as a reference to a hidden UserStyle
 that is stored inside of a map server.
 * @augments Intersection
 * @alias UserStyle
 * @param children
 * @constructor
 */
var UserStyle = function (children) {
	Intersection.call(this, "sld:UserStyle", children);
};

UserStyle.prototype = Object.create(Intersection.prototype);

UserStyle.prototype.validChildren = function() {
	return ['sld:Name','sld:Title','sld:Abstract','sld:isDefault','sld:FeatureTypeStyle'];
};

module.exports = UserStyle;