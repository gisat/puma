var MongoTheme = require('./MongoTheme');

class MongoThemes {
	constructor(connection) {
		this._connection = connection;
	}

	update(theme) {
		var self = this;
		return theme.json().then(function(jsonTheme){
			var collection = self._connection.collection(MongoTheme.collectionName());
			return collection.update({_id: jsonTheme._id}, jsonTheme);
		});
	}

	remove(theme) {
		var self = this;
		return theme.id().then(function(id){
			var collection = self._connection.collection(MongoTheme.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoThemes;