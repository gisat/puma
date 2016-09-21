class MongoFilteredCollection {
	constructor(filter, connection, name, constructor) {
		this._filter = filter;
		this._connection = connection;
		this._name = name;
		this._constructor = constructor;
	}

	read() {
		var self = this;
		return this._connection.collection(this._name).find(this._filter).toArray().then(function(jsonAttributeSets){
			var results = [];

			jsonAttributeSets.forEach(function(attributeSet) {
				results.push(new self._constructor(attributeSet._id, self._connection));
			});

			return results;
		});
	}
}

module.exports = MongoFilteredCollection;