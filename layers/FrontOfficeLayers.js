let _ = require('underscore');
let Promise = require('promise');

let FilteredMongoLayerGroups = require('./FilteredMongoLayerGroups');
let FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');
let FilteredMongoLayerTemplates = require('./FilteredMongoLayerTemplates');
let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredPgStyles = require('../styles/FilteredPgStyles');
let MongoFilteredCollection = require('../data/MongoFilteredCollection');
let PgStyles = require('../styles/PgStyles');

const PgLayers = require('../layers/PgLayers');

class FrontOfficeLayers {
	constructor(mongo, postgreSql, schema) {
		this.mongo = mongo;
		this.postgreSql = postgreSql;
		this.schema = schema;

		this._pgLayers = new PgLayers(postgreSql, mongo, schema);
	}

	/**
	 * It retrieves raster and vector layers in the format good for display in the front office.
	 * @param scope {Number} Id of the scope
	 * @param year {Number[]} Ids of the periods
	 * @param place {Number[]} Ids of the places
	 * @param theme {Number} Id of the theme
	 */
	vectorRasterLayers(scope, year, place, theme) {
		return this.getLayersWithMetadata(scope, year, place).then((layers) => {
			layers.references = layers.references.filter(reference => layers.layerTemplates[reference.areaTemplate].layerType != 'au');

			return this.getAdditionalMetadataForLayers(layers.references)
				.then(() => {
					if (theme){
						return new MongoFilteredCollection({_id: Number(theme)}, this.mongo, "theme").json().then(themes => {
							let theme = themes[0];
							let references = [];
							theme.topics.map(topic => {
								let ref = layers.references.filter(reference => layers.layerTemplates[reference.areaTemplate].topic === topic);
								references = references.concat(ref);
							});
							return this.groupLayersByNamePath(references, layers.layerGroups, layers.layerTemplates, layers.styles, year);
						})
					} else {
						return this.groupLayersByNamePath(layers.references, layers.layerGroups, layers.layerTemplates, layers.styles, year);
					}
				});
		});
	}

	getAdditionalMetadataForLayers(layers) {
		return this._pgLayers.all()
			.then((pgDataLayers) => {
				let promises = [];
				_.each(layers, (layer) => {
					let pgDataLayer = _.find(pgDataLayers, {path: layer.layer});
					layer.metadata = pgDataLayer.metadata;
					layer.custom = pgDataLayer.custom;
					layer.source_url = pgDataLayer.source_url;
				});
				return Promise.all(promises);
			});
	}

	/**
	 * It retrieves analytical units layers in the format good for the display in the Front Office.
	 * @param scope {Number} Id of the scope
	 * @param year {Number[]} Ids of the periods
	 * @param place {Number[]} Ids of the places or null, if null then all the places in given scope are used
	 * @param [level] {Number} Optional. If it is supplied it limits analytical units only to the ones with given area template.
	 */
	analyticalUnitsLayers(scope, year, place, level) {
		return this.getLayersWithMetadata(scope, year, place).then((layers) => {
			layers.references = layers.references.filter(reference => (level && reference.areaTemplate == level) || (!level && layers.layerTemplates[reference.areaTemplate].layerType == 'au'));

			return this.groupLayersByNamePath(layers.references, layers.layerGroups, layers.layerTemplates, layers.styles);
		});
	}

    /**
	 *
     * @param scope
     * @param year
     * @param place
     */
	getLayersWithMetadata(scope, year, place) {
		let filteredReferences, layerTemplates = {}, layerGroups = {}, stylesIds = [];
		let promise;
		if (!place) {
			scope = Number(scope);
			promise = new FilteredMongoLocations({dataset: scope}, this.mongo).json();
		} else {
			promise = Promise.resolve([{_id: Number(place)}]);
		}

		// TODO: Probably move elsewhere
		year = _.isArray(year.length) && year.map(period => Number(period)) || [Number(year)];

		return promise.then(places => {
			var filter = {
				year: {$in: year},
				location: {$in: places.map(place => place._id)},
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

			stylesIds = _.compact(_.flatten(stylesIds));

			// Every syle brings another layer from the FO perspective.
			let layerGroups = pLayerTemplates.map(template => template.layerGroup);
			layerGroups = _.compact(layerGroups);
			return new FilteredMongoLayerGroups({
				_id: {$in: layerGroups}
			}, this.mongo).json();
		}).then(pLayerGroups => {
			pLayerGroups.forEach(layerGroup => {
				layerGroups[layerGroup._id] = layerGroup;
			});

			return new FilteredPgStyles(this.postgreSql, this.schema, {
				id: stylesIds.map(styleId => `${styleId}`)
			}).all();
		}).then(result => {
			let styles = result;

			return {
				references: filteredReferences,
				layerGroups: layerGroups,
				layerTemplates: layerTemplates,
				styles: styles
			};
		})
	}

	/**
	 * It takes list of layers and returns only those that have unique combination of layer template and path.
	 * @private
	 * @param references
	 * @param layerGroups
	 * @param layerTemplates
	 * @param styles
     * @param [period] {number} Optional parameter.
	 * @returns {Array}
	 */
	groupLayersByNamePath(references, layerGroups, layerTemplates, styles, period) {
		var layers = references.map(reference => {
			let layerTemplate = layerTemplates[reference.areaTemplate];
			let layerGroup = layerGroups[layerTemplate.layerGroup];
			let layerStyles = styles.filter(style => layerTemplate && layerTemplate.symbologies && layerTemplate.symbologies.indexOf(Number(style.id)) !== -1 || false).map(style => {
				return {
					name: style.name,
					path: style.symbology_name
				}
			});

			let periodId = null;
			if (period){
			    periodId = Number(period);
            }
			return {
				id: reference._id,
				name: layerTemplate.name,
				layerTemplateId: layerTemplate._id,
				layerGroup: layerGroup,
				path: reference.layer,
				metadata: reference.metadata,
				source_url: reference.source_url,
				styles: layerStyles,
                period: periodId
			}
		});

		layers = _.compact(_.flatten(layers));

		var grouped = _.groupBy(layers, (layer) => {
			return layer.path + "_" + layer.name;
		});

		var uniqueLayers = Object.keys(grouped).map(key => {
			return grouped[key][0];
		});

		var groupedByLayerGroup = _.groupBy(uniqueLayers, (layer) => {
			return (layer.layerGroup && layer.layerGroup.name) || 'Other';
		});

		var groupedLayers = Object.keys(groupedByLayerGroup).map(key => {
			if(key === 'Other' && !groupedByLayerGroup[key][0].layerGroup) {
                return {
                    name: key,
                    id: 0,
                    layers: groupedByLayerGroup[key]
                }
			} else {
                return {
                    name: key,
                    id: groupedByLayerGroup[key][0].layerGroup._id,
                    layers: groupedByLayerGroup[key]
                }
            }
		});

		return groupedLayers.sort((a, b) => {
			let layerGroupA = a.layers.length && a.layers[0].layerGroup && a.layers[0].layerGroup.priority || Number.MAX_SAFE_INTEGER;
			let layerGroupB = b.layers.length && b.layers[0].layerGroup && b.layers[0].layerGroup.priority || Number.MAX_SAFE_INTEGER;
			if(layerGroupA < layerGroupB) {
				return -1
			} else if(layerGroupB < layerGroupA) {
				return 1;
			} else {
				return 0;
			}
		});
	}
}

module.exports = FrontOfficeLayers;