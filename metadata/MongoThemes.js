var MongoTheme = require('./MongoTheme');

class MongoThemes {
	constructor(connection) {
		this._connection = connection;
	}

	update(theme) {
		return theme.json().then(function(jsonTheme){
			return this._connection.update({_id: jsonTheme._id}, jsonTheme);
		});
	}

	remove(theme) {
		return theme.id().then(function(id){
			var collection = self._connection.collection(MongoTheme.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoThemes;