var Promise = require('promise');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoAnalysis = require('../analysis/FilteredMongoAnalysis');
var FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
var FilteredCompoundCollection = require('../data/FilteredCompoundCollection');
var FilteredMongoChartConfiguration = require('../visualization/FilteredMongoChartConfigurations');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var _ = require('underscore');

class MongoAttribute {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		// TODO: Remove attribute from columnMap
		this._layerReferences = new FilteredMongoLayerReferences({"columnMap.attribute": id}, connection);
		// TODO: remove attribute if there is more than one.
		// TODO: remove analysis when there is only one attribute.
		this._analysis = new FilteredCompoundCollection([
			new FilteredMongoAnalysis({"attributeMap.attribute": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.calcAttribute": id}, connection),
			new FilteredMongoAnalysis({"attributeMap.normAttribute": id}, connection)
		]);
		this._chartConfigurations = new FilteredCompoundCollection([
			new FilteredMongoChartConfiguration({"attrs.attr": id}, connection),
			new FilteredMongoChartConfiguration({"attrs.normAttr": id}, connection)
		]);

		this._dataViews = new FilteredCompoundCollection([
			new FilteredMongoDataViews({"conf.choroplethCfg.attr": id}, connection),
			new FilteredMongoDataViews({"conf.cfgs.cfg.attrs.attr": id}, connection)
		]);

		this._visualizations = new FilteredCompoundCollection([
			new FilteredMongoDataViews({"choroplethCfg.attr": id}, connection),
			new FilteredMongoDataViews({"cfg.attrs.attr": id}, connection)
		]);

		this._instance = new MongoUniqueInstance(id, connection, MongoAttribute.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	type() {
		return this._instance.read().then(json => {
			return json.type;
		});
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	analysis() {
		return this._analysis.read();
	}

	chartConfigurations() {
		return this._chartConfigurations.read();
	}

	dataViews() {
		return this._dataViews.read();
	}

	visualizations() {
		return this._visualizations.read();
	}

	json() {
		return this._instance.read();
	}

	static collectionName() {
		return "attribute";
	}
}

module.exports = MongoAttribute;