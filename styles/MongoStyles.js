var conn = require('../common/conn');
var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * Only for backward compatibility to other.
 * @alias MongoStyles
 * @augments Styles
 * @constructor
 */
var MongoStyles = function() {};

/**
 * @param style {Style}
 */
MongoStyles.prototype.add = function(style) {
	return style.json().then(function(json){
		return new Promise(function(resolve, reject){
			var db = conn.getMongoDb();
			var collection = db.collection('symbology');
			collection.insert(json, function(err) {
				if (err){
					logger.error("MongoStyles#add Error: ", err);
					reject(err);
				} else {
					resolve();
				}
			});
		})
	});
};

MongoStyles.prototype.update = function(style) {
	return style.json().then(function(json){
		return new Promise(function(resolve, reject){
			crud.update('symbology', json, {userId: json.changedBy, isAdmin: true}, function(err){
				if(!err) {
					resolve()
				} else {
					logger.error("MongoStyles#add Error: ", err);
					reject(err);
				}
			});
		})
	});
};

MongoStyles.prototype.delete = function(id) {
	let db = conn.getMongoDb();
	let collection = db.collection('symbology');
	return collection.deleteMany({_id: id});
};

module.exports = MongoStyles;