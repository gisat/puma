var Promise = require('promise');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoAttributeSets = require('./FilteredMongoAttributeSets');
var FilteredMongoAnalysis = require('../analysis/FilteredMongoAnalysis');
var FilteredCompoundCollection = require('../data/FilteredCompoundCollection');
var _ = require('underscore');

class MongoAttribute {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		this._layerReferences = new FilteredMongoLayerReferences({"columnMap.attribute": id}, connection);
		this._attributeSets = new FilteredMongoAttributeSets({attribute: id}, connection);
		this._analysis = new FilteredCompoundCollection([
			new FilteredMongoAnalysis({"attributeMap.attribute": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.calcAttribute": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.normAttribute": id}, connection)
		]);
	}

	id() {
		return Promise.resolve(this._id);
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	attributeSets() {
		return this._attributeSets.read();
	}

	analysis() {
		return this._analysis.read();
	}
}

module.export = MongoAttribute;