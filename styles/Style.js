var Audit = require('../data/Audit');
var Promise = require('promise');

/**
 * This class represents one style. It is more as an interface and every Style shouold implement all the methods available here.
 * @constructor
 * @alias Style
 * @augments Audit
 */
var Style = function () {
	Audit.call(this);
};

Style.prototype = Object.create(Audit.prototype);

/**
 * It returns this style represented as valid sld.
 * @returns {Promise}
 */
Style.prototype.sld = function () {};

/**
 * The definition of the Style.
 * @returns {Promise} JSON representation of the definition of the object.
 */
Style.prototype.definition = function() {};

/**
 * Name of the style. This is displayed to the user.
 * @returns {Promise} Name
 */
Style.prototype.name = function() {};

/**
 * Name of the symbology as stored in the geoserver.
 * @returns {Promise} Symbology name
 */
Style.prototype.symbologyName = function() {};

Style.prototype.json = function() {
	return Promise.all([this.uuid(), this.definition(), this.name(), this.symbologyName(), this.changed(), this.changedBy(), this.created(), this.createdBy()]).then(function (results) {
		return {
			_id: results[0],
			uuid: results[0],
			definition: results[1],
			name: results[2],
			symbologyName: results[3],
			changed: results[4],
			changedBy: results[5],
			created: results[6],
			createdBy: results[7]
		};
	});
};

module.exports = Style;