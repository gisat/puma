/**
 * This is the class representing Styles. Is meant to be an interface, which will be used by other objects.
 * @alias Styles
 * @constructor
 */
var Styles = function(){};

/**
 * This returns all styles available in a given data source. This is based on the implementation.
 * @returns {Promise} Return all styles in given data source.
 */
Styles.prototype.all = function(){};

/**
 * It adds style to the current data source.
 * @param style {Style} Style to add
 * @returns {Promise} It return style which was added to the current data source.
 */
Styles.prototype.add = function(style){};

/**
 * It updates the style in current data source.
 * @param style {Style} Style which must be updated.
 */
Styles.prototype.update = function(style){};

module.exports = Styles;