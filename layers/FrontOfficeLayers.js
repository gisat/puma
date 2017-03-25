let _ = require('underscore');
let Promise = require('promise');

let FilteredMongoLayerGroups = require('./FilteredMongoLayerGroups');
let FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');
let FilteredMongoLayerTemplates = require('./FilteredMongoLayerTemplates');
let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredPgStyles = require('../styles/FilteredPgStyles');
let PgStyles = require('../styles/PgStyles');

class FrontOfficeLayers {
	constructor(mongo, postgreSql, schema) {
		this.mongo = mongo;
		this.postgreSql = postgreSql;
		this.schema = schema;
	}

	/**
	 * It retrieves layer in the format good for display in the front office.
	 * @param scope {Number} Id of the scope
	 * @param year {Number[]} Ids of the periods
	 * @param place {Number[]} Ids of the places
	 */
	withAreaTemplateNameAndLayerGroup(scope, year, place) {
		let filteredReferences, layerTemplates = {}, layerGroups = {}, stylesIds = [];
		let promise;
		if (!place) {
			promise = new FilteredMongoLocations({dataset: scope}, this.mongo).json();
		} else {
			promise = Promise.resolve(place);
		}

		return promise.then(place => {
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
			pLayerTemplates.forEach(layerTemplate => {
				layerTemplates[layerTemplate._id] = layerTemplate;
				stylesIds.push(layerTemplate.symbologies);
			});

			stylesIds = _.flatten(stylesIds);

			// Every syle brings another layer from the FO perspective.
			let layerGroups = pLayerTemplates.map(template => template.layerGroup);
			return new FilteredMongoLayerGroups({
				_id: {$in: layerGroups}
			}, this.mongo).json();
		}).then(pLayerGroups => {
			pLayerGroups.forEach(layerGroup => {
				layerGroups[layerGroup._id] = layerGroup;
			});

			new FilteredPgStyles(this.postgreSql, this.schema, {
				id: stylesIds
			})
		}).then(pStyles => {
			let styles = {};
			pStyles.forEach(style => {
				styles[style.id] = style;
			});

			return this.groupLayersByNamePath(filteredReferences, layerGroups, layerTemplates, styles);
		})
	}

	/**
	 * It takes list of layers and returns only those that have unique combination of layer template and path.
	 * @private
	 * @param references
	 * @param layerGroups
	 * @param layerTemplates
	 * @param styles
	 * @returns {Array}
	 */
	groupLayersByNamePath(references, layerGroups, layerTemplates, styles) {
		var layers = references.map(reference => {
			let layerTemplate = layerTemplates[reference.areaTemplate];
			let layerGroup = layerGroups[layerTemplate.layerGroup];
			let layerStyles = styles.filter(style => layerTemplate.symbologies.indexOf(style.id)).map(style => {
				return {
					name: style.name,
					path: style.symbology_name
				}
			});
			return {
				id: reference._id,
				name: layerTemplate.name,
				layerGroup: layerGroup,
				path: reference.layer,
				styles: layerStyles
			}
		});

		layers = _.flatten(layers);

		var grouped = _.groupBy(layers, (layer) => {
			return layer.path + "_" + layer.name;
		});

		return Object.keys(grouped).map(key => {
			return grouped[key][0];
		});
	}
}

module.exports = FrontOfficeLayers;