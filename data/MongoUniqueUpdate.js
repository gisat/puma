var _ = require('underscore');

class MongoUniqueUpdate {
	/**
	 * @param objectToUpdate {Object}
	 * @param options {Object}
	 * @param options.create {Object[]} {key:value}
	 * @param options.update {Object[]} {key: value} if the value is array it either creates the array if there is none or append not existing yet values to the array.
	 * @param options.remove {Object[]} {key} or {key:value} Where in case value is Array it removes all elements in the value array.
	 */
	constructor(objectToUpdate, options) {
		this.createProperties(options.create || [], objectToUpdate);
		this.updateProperties(options.update || [], objectToUpdate);
		this.removeProperties(options.remove || [], objectToUpdate);

		this._updatedObject = objectToUpdate;
	}

	/**
	 * It provides the object in a json representation with all transformation performed.
	 * @return {Object} Object which was transformed based on the provided rules.
	 */
	json() {
		return this._updatedObject;
	}

	createProperties(create, objectToUpdate) {
		create.forEach(function(create){
			objectToUpdate[create.key] = create.value;
		});
	}

	updateProperties(update, objectToUpdate) {
		update.forEach(function(update){
			if(_.isArray(update.value)) {
				if(!_.isArray(objectToUpdate[update.key])){
					objectToUpdate[update.key] = update.value;
				} else {
					objectToUpdate[update.key] = _.union(objectToUpdate[update.key], update.value);
				}
			} else {
				objectToUpdate[update.key] = update.value;
			}
		});
	}

	removeProperties(remove, objectToUpdate) {
		remove.forEach(function(remove){
			if(_.isArray(remove.value)) {
				objectToUpdate[remove.key] = _.difference(objectToUpdate[remove.key], remove.value);
			} else {
				delete objectToUpdate[remove.key];
			}
		});
	}
}

module.exports = MongoUniqueUpdate;