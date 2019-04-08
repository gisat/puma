var StyledLayerDescriptor = require('./sld/StyledLayerDescriptor');
var Style = require('./Style');
var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * This class represents one style. It is possible to load style from the PostgreSQL as well as it is possible to generate SLD from such style as well as it is possible to load the style.
 * @param id {String} Unique identifier for the Style
 * @param jsonObject {Object} Definition of the style, based on which it is necessary to create valid SLD.
 * @param currentUserId {Number} Optional. Id of the current user. Only relevant when creating.
 * @constructor
 * @alias RestStyle
 * @augments Style
 */
var RestStyle = function (id, jsonObject, currentUserId) {
	Style.call(this);

	this._id = id;
	this._definition = jsonObject.definition;
	this._name = jsonObject.name;
	this._symbologyName = jsonObject.symbologyName || jsonObject.symbology_name;
	this._source = jsonObject.source;
	this._sld = jsonObject.sld;

	if(this._source == "sld") {
		this._symbologyName = this._id;
	}

	this._created = jsonObject.created || new Date();
	this._createdBy = jsonObject.createdBy || currentUserId;
	this._changed = jsonObject.changed || new Date();
	this._changedBy = jsonObject.changedBy || currentUserId;
};

RestStyle.prototype = Object.create(Style.prototype);

/**
 * @inheritDoc
 */
RestStyle.prototype.id = function() {
	return Promise.resolve(this._id);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.definition = function() {
	return Promise.resolve(this._definition);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.name = function() {
	return Promise.resolve(this._name);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.symbologyName = function() {
	return Promise.resolve(this._symbologyName);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.changed = function() {
	return Promise.resolve(this._changed);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.changedBy = function() {
	return Promise.resolve(this._changedBy);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.created = function() {
	return Promise.resolve(this._created);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.createdBy = function() {
	return Promise.resolve(this._createdBy);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.source = function() {
	return Promise.resolve(this._source);
};

/**
 * @returns {Boolean} True if the description is valid and contains all relevant parts.
 */
RestStyle.validateDescriptionCreation = function (description) {
	logger.info("Style#validateDescriptionCreation Description: ", description);
	return !(!description || !description.type);
};

/**
 * @inheritDoc
 */
RestStyle.prototype.sld = function () {
	if(this._source === 'geoserver') {
		return Promise.resolve('');
	}
	return Promise.resolve(this._sld || StyledLayerDescriptor.fromObjectDescription(this._definition).toXml());
};

/**
 *
 * @param description {Object} Representation of created SLD.
 * @returns {Boolean} True if the update of the description is valid. It is more stronger validation then the previous one.
 */
RestStyle.validateDescriptionUpdate = function (description) {
	logger.info("Style#validateDescriptionUpdate Description: ", description);
	if (!description || !description.type || !description.filterType || !description.rules || !description.rules.length) {
		return false;
	}

	var areRulesCorrectlyFormed = true;

	description.rules.forEach(function (rule) {
		if (!rule.appearance || !rule.name) {
			areRulesCorrectlyFormed = false;
		}
	});

	return areRulesCorrectlyFormed;
};

RestStyle.fixture = function(id) {
	return new RestStyle(id, {
		definition: {
			"type": "polygon", // PolygonSymbolizer
			"filterAttributeKey": 5, // Filter id of attributeset, PropertyName
			"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
			"filterType": "attributeCsv", // Comma separated values
			"rules": [
				{
					"name": "Urban fabric", // sld:Name in the Rule
					"title": "Urban fabric", // sld:Title in the Rule
					"appearance": {
						"fillColour": "#D0091D" // CssParameter with name="fill" based on the start of the name. Possible choices will be represented in the name.
					},
					"filter": {
						"attributeCsv": {
							"values": "111,112,113" // Values present in the attribute, PropertyValues as Literals inside of the Filter
						},
						"attributeInterval": {} // Ignore. Just needs to be part of the javascript model.
					}
				},
				{
					"name": "Non-urban artificial areas",
					"title": "Non-urban artificial areas",
					"appearance": {
						"fillColour": "#AE0214"
					},
					"filter": {
						"attributeCsv": {
							"values": "120,121,130,140"
						},
						"attributeInterval": {}
					}
				},
				{
					"name": "Natural and semi-natural areas",
					"title": "Natural and semi-natural areas",
					"appearance": {
						"fillColour": "#59B642"
					},
					"filter": {
						"attributeCsv": {
							"values": "310,320,330"
						},
						"attributeInterval": {}
					}
				},
				{
					"name": "Water",
					"title": "Water",
					"appearance": {
						"fillColour": "#56C8EE"
					},
					"filter": {
						"attributeCsv": {
							"values": "510,512,520"
						},
						"attributeInterval": {}
					}
				}
			]
		},
		name: 'Name',
		symbologyName: 'Symbology name',
		created: new Date(2015,2,2,10,12,20,10),
		createdBy: 1,
		changed: new Date(2015,2,2,10,12,20,10),
		changedBy: 1
	})
};

module.exports = RestStyle;