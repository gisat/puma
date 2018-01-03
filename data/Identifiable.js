/**
 * Every entity should be identifiable.
 * @alias Identifiable
 * @constructor
 */
var Identifiable = function() {};

/**
 * @return id {Promise} Uuid pf the given identifiable.
 */
Identifiable.prototype.id = function(){};

module.exports = Identifiable;