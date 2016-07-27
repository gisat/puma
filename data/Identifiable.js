/**
 * Every entity should be identifiable.
 * @alias Identifiable
 * @constructor
 */
var Identifiable = function() {};

/**
 * @return uuid {Promise} Uuid pf the given identifiable.
 */
Identifiable.prototype.uuid = function(){};

module.exports = Identifiable;