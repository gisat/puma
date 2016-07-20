var util = require('util');

var Node = require('./Node');

/**
 * It represents nodes with children nodes instead of the value.
 * @param name {String} Name of the current node.
 * @param children {Node[]} Children nodes
 * @constructor
 * @alias Intersection
 * @augments Node
 */
var Intersection = function (name, children) {
	Node.call(this, name);

	// In case user provides single value transform it into the array.
	if (children && !(children instanceof Array)) {
		children = [children];
	}
	this._children = children || [];

	this.validate();
};

Intersection.prototype = Object.create(Node.prototype);

/**
 * It validates whether children are correct.
 * @throws Error If there is invalid children.
 */
Intersection.prototype.validate = function() {
	var validOnes = this.validChildren();

	this._children.forEach(function(child){
		var isValid = false;

		validOnes.forEach(function(name){
			if(child.is(name)) {
				isValid = true;
			}
		});

		if(!isValid) {
			throw new Error('Trying to build invalidate. Wrong element: ' + child.name);
		}
	});
};

/**
 * It must return an array of valid children of given Intersection node.
 * @returns {String[]} Array of valid names of children elements.
 */
Intersection.prototype.validChildren = function(){
	throw new Error('Children must override this method');
};

/**
 * @inheritDoc
 */
Intersection.prototype.toXml = function () {
	var value = "";
	this._children.forEach(function (node) {
		value += node.toXml();
	});

	return util.format('<%s>%s</%s>', this._name, value, this._name);
};

module.exports = Intersection;