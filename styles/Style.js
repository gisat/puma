var StyledLayerDescriptor = require('./sld/StyledLayerDescriptor');

/**
 * This class represents one style. It is possible to load style from the PostgreSQL as well as it is possible to generate SLD from such style as well as it is possible to load the style.
 * @param uuid {String} Unique identifier for the Style
 * @param definition {Object} Definition of the style, based on which it is necessary to create valid SLD.
 * @constructor
 * @alias Symbology
 */
var Style = function (uuid, definition) {
	this._uuid = uuid;
	this._definition = definition;

	this._sld = null;
};

/**
 * It returns this style represented as valid SQL.
 * @returns {SLD}
 */
Style.prototype.toSld = function () {
	this._sld = StyledLayerDescriptor.fromObjectDescription(this._definition).toXml();
	return this._sld;
};

/**
 * It returns SQL representation of the current style.
 * @returns {String} SQL representation of this entity.
 */
Style.prototype.toSql = function () {
	if (!this._sld) {
		this._sld = this.toSld();
	}

	// Generate SQL representation. Sql contains uuid and the sld as an xml.
};

Style.prototype.save = function (store) {
	return store.save(this);
};

/**
 * @returns {Boolean} True if the description is valid and contains all relevant parts.
 */
Style.validateDescriptionCreation = function (description) {
	if (!description || !description.type || !description.filterType) {
		return false;
	}
};

/**
 *
 * @param description {Object} Representation of created SLD.
 * @returns {Boolean} True if the update of the description is valid. It is more stronger validation then the previous one.
 */
Style.validateDescriptionUpdate = function (description) {
	if (!description || !description.type || !description.filterAttributeKey || !description.filterAttributeSetKey || !description.filterType || !description.rules) {
		return false;
	}

	var areRulesCorrectlyFormed = true;

	description.rules.forEach(function (rule) {
		if (!rule.appearance || !rule.title) {
			areRulesCorrectlyFormed = false;
		}
	});

	return areRulesCorrectlyFormed;
};

module.exports = Style;