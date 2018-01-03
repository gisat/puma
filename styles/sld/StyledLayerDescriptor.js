var util = require('util');

var Intersection = require('./common/Intersection');

var FeatureTypeStyle = require('./FeatureTypeStyle');
var Name = require('./Name');
var NamedLayer = require('./NamedLayer');
var Rule = require('./Rule');
var Title = require('./Title');
var UserStyle = require('./UserStyle');

/**
 * This class represents whole document. An SLD document is defined as a sequence of styled layers.
 * @constructor
 * @alias StyledLayerDescriptor
 * @augments Intersection
 */
var StyledLayerDescriptor = function (children) {
	Intersection.call(this, "sld:StyledLayerDescriptor");

	this._children = children;
};

StyledLayerDescriptor.prototype = Object.create(Intersection.prototype);

/**
 * @inheritDoc
 */
StyledLayerDescriptor.prototype.validChildren = function() {
	return ['sld:NamedLayer', 'sld:UserLayer']; // UserLayer isn't yet supported.
};

StyledLayerDescriptor.prototype.toXml = function () {
	var value = "";
	this._children.forEach(function (child) {
		value += child.toXml();
	});

	return util.format('<%s xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">%s</%s>', this._name, value, this._name);
};

/**
 * It takes object representation, which can be transferred from the outside world and generates valid SLD document from them.
 * @param objectDescription {Object} Valid object representation of style.
 * @returns {StyledLayerDescriptor}
 */
StyledLayerDescriptor.fromObjectDescription = function(objectDescription) {
	var rules = [];
	var rulesToGenerate = objectDescription.rules || [];
	rulesToGenerate.forEach(function(rule){
		rules.push(Rule.fromObjectDescription(rule, objectDescription.type, objectDescription.filterAttributeKey, objectDescription.filterAttributeSetKey, objectDescription.filterType));
	});

	return new StyledLayerDescriptor([
		new Name('Style'),
		new Title('Style'),
		new NamedLayer([
			new UserStyle([
				new FeatureTypeStyle(rules)
			])
		])
	]);
};

module.exports = StyledLayerDescriptor;