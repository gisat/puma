var Intersection = require('./common/Intersection');

/**
 * And in the Styled layer description document.
 * @param children {Node[]} Children nodes
 * @constructor
 * @augments Intersection
 * @alias And
 */
var And = function (children) {
	Intersection.call(this, "ogc:And", children);
};

And.prototype = Object.create(Intersection.prototype);

module.exports = And;