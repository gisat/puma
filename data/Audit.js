var Identifiable = require('./Identifiable');

/**
 * An audit object, which contains all the information which must the Audit object contain.
 * @constructor
 * @alias Audit
 * @augments Identifiable
 */
var Audit = function() {
	Identifiable.call(this);
};

Audit.prototype = Object.create(Identifiable.prototype);

/**
 * The last time when current object changed.
 * @return {Promise} Last time this object changed
 */
Audit.prototype.changed = function() {};

/**
 * Id of a person who changed the object.
 * @return {Promise} Id of the last changing person
 */
Audit.prototype.changedBy = function() {};

/**
 * The time when the object was created.
 * @return {Promise} The time when the object was created.
 */
Audit.prototype.created = function() {};

/**
 * Id of a person who created the object.
 * @return {Promise} Id of the one who created this object.
 */
Audit.prototype.createdBy = function() {};

module.exports = Audit;