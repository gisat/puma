let _ = require('underscore');
let Promise = require('promise');

let FilteredMongoLayerGroups = require('./FilteredMongoLayerGroups');
let FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');
let FilteredMongoLayerTemplates = require('./FilteredMongoLayerTemplates');
let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');

class FrontOfficeLayers {
	constructor(mongo) {
		this.mongo = mongo;
	}

	/**
	 * It retrieves layer in the format good for display in the front office.
	 * @param scope {Number} Id of the scope
	 * @param year {Number[]} Ids of the periods
	 * @param place {Number[]} Ids of the places
	 */
	withAreaTemplateNameAndLayerGroup(scope, year, place) {
		let filteredReferences, layerTemplates;
		let promise;
		if (!place) {
			promise = new FilteredMongoLocations({dataset: scope}, this.mongo).json();
		} else {
			promise = Promise.resolve(place);
		}

		promise.then(place => {
			var filter = {
				year: {$in: year},
				location: {$in: place},
				isData: false /* We want only base layer references */
			};

			return new FilteredMongoLayerReferences(filter, this.mongo).json();
		}).then(pFilteredReferences => {
			filteredReferences = pFilteredReferences;
			let areaTemplates = filteredReferences.map(reference => reference.areaTemplate);
			return new FilteredMongoLayerTemplates({
				_id: {$in: areaTemplates}
			}, this.mongo).json();
		}).then(pLayerTemplates => {
			layerTemplates = {};
			pLayerTemplates.forEach(layerTemplate => {
				layerTemplates[layerTemplate._id] = layerTemplate;
			});

			let layerGroups = pLayerTemplates.map(template => template.layerGroup);
			return new FilteredMongoLayerGroups({
				_id: {$in: layerGroups}
			}, this.mongo).json();
		}).then(pLayerGroups => {
			let layerGroups = {};
			pLayerGroups.forEach(layerGroup => {
				layerGroups[layerGroup._id] = layerGroup;
			});

			return this.groupLayersByNameAndPath(filteredReferences, layerGroups, layerTemplates);
		})
	}

	/**
	 * It takes list of layers and returns only those that have unique combination of layer template and path.
	 * @private
	 * @param references
	 * @param layerGroups
	 * @param layerTemplates
	 * @returns {Array}
	 */
	groupLayersByNameAndPath(references, layerGroups, layerTemplates) {
		var layers = references.map(reference => {
			let layerTemplate = layerTemplates[reference.areaTemplate];
			let layerGroup = layerGroups[layerTemplate.layerGroup];
			return {
				id: reference._id,
				name: layerTemplate.name,
				layerGroup: layerGroup,
				path: reference.layer
			}
		});

		var grouped = _.groupBy(layers, (layer) => {
			return layer.path + "_" + layer.name;
		});

		return Object.keys(grouped).map(key => {
			return grouped[key][0];
		});
	}
}

module.exports = FrontOfficeLayers;