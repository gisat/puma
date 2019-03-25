var Promise = require('promise');
var FilteredMongoAttributes = require('./FilteredMongoAttributes');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoAnalysis = require('../analysis/FilteredMongoAnalysis');
var FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
var FilteredMongoVisualizations = require('../visualization/FilteredMongoVisualizations');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var FilteredCompoundCollection = require('../data/FilteredCompoundCollection');

class MongoAttributeSet {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		// The information is stored in this instance in mongo.
		this._mongoInstance = new MongoUniqueInstance(id, connection, MongoAttributeSet.collectionName());
		this._layerReferences = new FilteredMongoLayerReferences({"attributeSet": id}, connection);

		this._analysis = new FilteredCompoundCollection([
			new FilteredMongoAnalysis({"attributeSet": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.attributeSet": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.calcAttributeSet": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.normAttributeSet": id}, connection),
			new FilteredMongoAnalysis({"groupAttributeSet": id}, connection)]
		);
		this._dataViews = new FilteredCompoundCollection([
			new FilteredMongoDataViews({"conf.choroplethCfg.as": id}, connection),
			new FilteredMongoDataViews({"conf.cfgs.cfg.attrs.as": id}, connection),
			new FilteredMongoDataViews({"visibleLayers.attribute": id}, connection)
		]);
		this._visualizations = new FilteredCompoundCollection([
			new FilteredMongoVisualizations({"cfg.attrs.as": id}, connection),
			new FilteredMongoVisualizations({"choroplethCfg.as": id}, connection),
			new FilteredMongoVisualizations({"visibleLayers.attributeSet": id}, connection)
		]);
	}

	id() {
		return Promise.resolve(this._id);
	}

	attributes() {
		return this.load().then(function (jsonInstance) {
			return new FilteredMongoAttributes({"_id": {$in: jsonInstance.attributes}}, this._connection)
				.read();
		});
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	analysis() {
		return this._analysis.read();
	}

	load() {
		return this._mongoInstance.read();
	}

	dataViews() {
		return this._dataViews.read();
	}

	visualizations() {
		return this._visualizations.read();
	}

	json() {
		return this._mongoInstance.read();
	}

	static collectionName() {
		return 'attributeset';
	}
}

module.exports = MongoAttributeSet;