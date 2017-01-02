var Styles = require('./Styles');

var Promise = require('promise');

/**
 * @augments Styles
 * @param config {Object}
 * @param config.styles {Styles[]} All representations of style which should be handled transactional
 * @constructor
 */
var CompoundStyles = function(config) {
	Styles.call(this);

	this._styles = config.styles || [];
};

CompoundStyles.prototype = Object.create(Styles.prototype);

/**
 * @inheritDoc
 */
CompoundStyles.prototype.add = function(style) {
	var promises = [];
	this._styles.forEach(function(styles){
		promises.push(styles.add(style));
	});

	return Promise.all(promises);
};

/**
 * @inheritDoc
 */
CompoundStyles.prototype.update = function(style) {
	var promises = [];
	this._styles.forEach(function(styles){
		promises.push(styles.update(style));
	});

	return Promise.all(promises);
};

CompoundStyles.prototype.delete = function(id) {
	return Promise.all(this._styles.map(style => style.delete(id)))
};

module.exports = CompoundStyles;