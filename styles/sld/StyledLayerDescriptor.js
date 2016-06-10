var util = require('util');

var Node = require('./common/Node');

/**
 * This class represents whole document. The logic is therefore a bit different.
 * @constructor
 */
var StyledLayerDescriptor = function (children) {
	Node.call(this, "sld:StyledLayerDescriptor");

	this._children = children;
};

StyledLayerDescriptor.prototype = Object.create(Node.prototype);

StyledLayerDescriptor.prototype.toXml = function () {
	var value = "";
	this._children.forEach(function (child) {
		value += child.toXml();
	});

	return util.format('<%s xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">%s</%s>', this._name, value, this._name);
};

module.exports = StyledLayerDescriptor;