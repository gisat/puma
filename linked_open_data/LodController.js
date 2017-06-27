var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var TacrPhaStatistics = require('../tacrpha/TacrPhaStatistics');
var utils = require('../tacrpha/utils');
let _ = require('lodash');

var request = require('request');
var Promise = require('promise');
var csv = require('csv');

let GeometryToPsql = require('./postgresql/GeometryToPsql');
let GeoServerLayers = require('../layers/GeoServerLayers');
let RestLayer = require('../layers/RestLayer');

let ProjectionConverter = require('../format/projection/ProjectionConverter');

let IPRAttributes = require('./queries/IPRAttributes');
let IPRData = require('./queries/IPRData');
let IPRDatasets = require('./queries/IPRDatasets');

class LodController {
    constructor (app, pool) {
		app.post("/iprquery/dataset", this.datasetSearch.bind(this));

		app.get("/iprquery/statistics", this.statistics.bind(this));

		app.get('/iprquery/attributes', this.attributes.bind(this));
		app.get('/iprquery/data', this.data.bind(this)); // Expects relationship, geometry, words No geometry means no geometry filter.

        this._geometryToPsql = new GeometryToPsql(pool);
		this._projectionConverter = new ProjectionConverter();
		this._geoServerLayers = new GeoServerLayers(
			config.geoserverHost + config.geoserverPath,
			config.geoserverUsername,
			config.geoserverPassword
		);

		this._statistics = new TacrPhaStatistics(pool);
	}

    attributes(request, response) {
		let params = LodController.parseRequestString(request.query.params);
    	new IPRAttributes(params, request.query.type).json().then(results => {
    		logger.info('LodController#attributes Results: ', results);
			response.json({
				status: 'ok',
				datasets: results
			});
		}).catch(err => {
			logger.error(`LodController#attributes Error: `, err);
			response.status(500).json({
				status: 'err'
			})
		});
	}

	data(request, response) {
    	console.log(request.query);
    	console.log(request);
    	new IPRData(request.query.filters).json().then(data => {
			let values = data.values;
			let srid = data.srid;
			let amount = data.amount;
			let color = data.color;
			let convertedValues = [];
			let createdTableName;
			let createdStyleName;

			_.each(values, value => {
				convertedValues.push(this._projectionConverter.convertWktKrovakToWgs84(value));
			});

			return this._geometryToPsql
				.prepareGeometryTable()
				.then(tableName => {
					createdTableName = tableName;
					return this._geometryToPsql
						.addWktGeometryToTable(
							tableName,
							convertedValues,
							4326
						)
				})
				.then(() => {
					return this.getPublicWorkspaceSchema();
				})
				.then((publicWorkspaceSchema) => {
					return this._geoServerLayers.create(new RestLayer(createdTableName, publicWorkspaceSchema.workspace, config.geoServerDataStore));
				})
				.then(() => {
					createdStyleName = `style_${createdTableName}`;
					return this._geoServerLayers.createBasicPolygonStyle(createdStyleName, color);
				})
				.then(() => {
					return this._geoServerLayers.setExistingStyleToLayer(createdTableName, createdStyleName);
				})
				.then((results) => {
					response.json({
						status: 'ok',
						wms: {
							url: `${config.remoteProtocol}://${config.remoteAddress}/${config.geoserverPath}/wms`,
							layer: createdTableName,
							style: createdStyleName
						},
						amount: data.amount
					});
					console.log(`#### OK ####`);
				})
		}).catch(error => {
			console.log(error);
		});
	}

    /**
     * Return searching history statistics
     * @param req
     * @param res
     */
    statistics(req, res){
        let type = req.query.type;
        this._statistics.getSearchStringFrequency(type).then(function(result){
            logger.info(`INFO iprquery#statistics result: ` + result);
            let frequencies = [];
            result.rows.map(record => {
                frequencies.push([record.keywords, Number(record.num)]);
            });

            res.send(frequencies);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR iprquery#statistics Error: `, err)
            )
        });
    }

	/**
	 * Basic method for searching datasets
	 * @param req
	 * @param res
	 */
	datasetSearch(req, res){
		let keywords = this.constructor.parseRequestString(req.body.search);
		var self = this;
		if (keywords.length == 0){
			logger.info(`INFO iprquery#dataset keywords: No keywords`);
			var json = {
				status: "OK",
				message: "Žádná klíčová slova pro vyhledávání. Klíčové slovo musí mít alespoň dva znaky a nesmí obsahovat rezervovaná slova pro SPARQL!",
				data: []
			};
			res.send(json);
		} else {
			let type = this.constructor.getTypeString(req.body.settings.type);
			logger.info(`INFO iprquery#dataset keywords: ` + keywords);

			var sparql = this.prepareDatasetQuery(keywords, type);
			this.endpointRequest(sparql).then(function(result){
				result.keywords = keywords;
				res.send(result);
				self._statistics.insert(req.headers.origin, keywords, result);
			});
		}
	};

    /**
     * Prepare sparql query for dataset
     * @param values {Array} values for searching
     * @param type {string} operators
     * @returns {string}
     */
    prepareDatasetQuery(values, type){
        var query = this._datasetEndpoint + '?query=';
        var prefixes = this._prefixes.join(' ');

		var filter = [];
		values.map((value) => {
			value = utils.removeWordEnding(value);
			filter.push('regex(str(?ipr_sub), "' + value + '", "i")');
		});
		filter = 'FILTER(' + filter.join(type) + ')';

		var sparql = `
        ${prefixes}
        
        SELECT
            DISTINCT
            (?datasetName as ?dataset)
            (?ipr_obj as ?dataset_uri)
        WHERE {
            ?ipr_sub common:isInContextOfDataset ?ipr_obj .
        
            ?ipr_obj rdfs:label ?datasetName .
            ${filter}
        }`;

        logger.info(`INFO iprquery#prepareTermsQuery sparql: ` + sparql);
        logger.info(`INFO iprquery#prepareTermsQuery full query: ` + query + sparql);

        return query + encodeURIComponent(sparql);
    }

    endpointRequest(sparql){
        return new Promise(function(resolve, reject){
            request(sparql, function (error, response, body) {
                let json = {};
                if (error) {
                    json.status = "ERROR";
                    json.message = "Endpoint není dostupný! (Error message: " + error + " )";
                    logger.error(`ERROR iprquery#endpointRequest request: ` + error);
                    resolve(json);
                } else if (response.statusCode >= 400){
                    json.status = "ERROR";
                    json.message = "Endpoint není dostupný! (Error message: " + response.statusCode + ": " + response.statusMessage + " )";
                    logger.error (`ERROR iprquery#endpointRequest request: ` + response.statusCode + ": " + response.statusMessage);
                    resolve(json);
                } else {
                    csv.parse(body, function(error, result){
                        if(error){
                            json.status = "ERROR";
                            json.message = error;
                            logger.error(`ERROR iprquery#endpointRequest csv.parse:` + error);
                            resolve(json);
                        } else {
                            var header = result[0];
                            json.status = "OK";
                            json.data = [];
                            result.map((item, i) => {
                                var record = {};
                                header.map((column, j) => {
                                    record[column] = item[j];
                                });

                                if (i > 0){
                                    json.data.push(record);
                                }
                            });
                            resolve(json);
                        }
                    });
                }
            });
        });
    }

    /**
     * Prepare keywords for searching
     * @param reqString {string} request string
     * @returns {Array} keywords
     */
    static parseRequestString(reqString){
        logger.info(`INFO iprquery#parseRequestString reqString: ` + reqString);

        reqString = utils.replaceInterpunction(reqString);
        reqString = utils.removeDiacritics(reqString);
        reqString = utils.removeReservedWords(reqString);
        reqString = utils.removeSpecialCharacters(reqString);
        var list = reqString.split(" ");

        return utils.removeMonosyllabics(list);
    }

    /**
     * Convert type of operator to symbol
     * @param type {string}
     * @returns {string} symbol
     */
    static getTypeString(type){
        var symbol = " && ";
        if (type == "or"){
            symbol = " || ";
        }
        return symbol;
    }

    /**
     * Return object with public workspace and schema based on config
     */
    getPublicWorkspaceSchema() {
        return Promise.resolve().then(() => {
            let workspaceSchema = {};
            _.each(config.workspaceSchemaMap, (schema, workspace) => {
                if (schema === "public" && !workspaceSchema.schema && !workspaceSchema.workspace) {
                    workspaceSchema.schema = schema;
                    workspaceSchema.workspace = workspace;
                }
            });
            return workspaceSchema;
        });
    }
}

module.exports = LodController;