/**
 * This class represents one style. It is possible to load style from the PostgreSQL as well as it is possible to generate SLD from such style as well as it is possible to load the style.
 * @param uuid {String} Unique identifier for the Style
 * @param definition {Object} Definition of the style, based on which it is necessary to create valid SLD.
 * @constructor
 * @alias Symbology
 */
var Style = function(uuid, definition) {
	this._uuid = uuid;
	this._definition = definition;
};



module.exports = Style;