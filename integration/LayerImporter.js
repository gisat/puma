let Promise = require('promise');
let request = require('superagent');
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let unzip = require('unzip');

let conn = require('../common/conn');
let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
let FilteredMongoThemes = require('../metadata/FilteredMongoThemes');
let FilteredMongoLayerGroups = require('../metadata/FilteredMongoLayerGroups');
let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
let GeoServerImporter = require('../layers/GeoServerImporter');
let MongoAttribute = require('../attributes/MongoAttribute');
let MongoAttributes = require('../attributes/MongoAttributes');
let MongoAttributeSets = require('../attributes/MongoAttributeSets');
let MongoLayerReferences = require('../layers/MongoLayerReferences');
let MongoLayerReference = require('../layers/MongoLayerReference');
let MongoLayerTemplates = require('../layers/MongoLayerTemplates');
let MongoLayerGroups = require('../layers/MongoLayerGroups');
let MongoLayerGroup = require('../layers/MongoLayerGroup');
let MongoTopics = require('../metadata/MongoTopics');
let MongoTopic = require('../metadata/MongoTopic');
let MongoTheme = require('../metadata/MongoTheme');
let MongoScope = require('../metadata/MongoScope');
let MongoDataViews = require('../visualization/MongoDataViews');
let PgLayerViews = require('../layers/PgLayerViews');
let RasterToPGSQL = require('../integration/RasterToPGSQL');
let PgPermissions = require('../security/PgPermissions');
let LayerAnalysis = require('../analysis/spatial/LayerAnalysis');
let Permission = require('../security/Permission');

let DBFEditor = require('./DBFEditor');
let PgLayer = require('../layers/PgLayer');
let PgLayers = require('../layers/PgLayers');

class LayerImporter {
    constructor(pgPool, mongo, importerTasks, schema) {
        this._pgPool = pgPool;
        this._mongo = mongo;
        this._importerTasks = importerTasks;
        this._currentImportTask = {};
        this._datastore = config.geoServerDataStore;

        this._pgLayers = new PgLayers(pgPool, mongo, schema);
        this._pgPermissions = new PgPermissions(pgPool, schema);
    }

    /**
     * Return current import task
     * @returns current import task
     */
    getCurrentImporterTask() {
        return this._currentImportTask;
    }

    /**
     * Execute import of the layer without executing the statistical part as well as
     * @param importTask Task stored in PGSQL
     * @param inputs
     */
    importLayerWithoutMapping(importTask, inputs) {
        logger.info('LayerImporter#importLayerWithoutMapping');

        this._currentImportTask = importTask;

        this._currentImportTask.inputs = inputs;

        let totalImportSteps = 5, currentImportStep = 0;
        return this.prepareLayerFilesForImport(this._currentImportTask).then((layer) => {
            logger.info('LayerImporter#importLayerWithoutMapping. Layer', layer);
            this._currentImportTask.layer = layer;
            this._currentImportTask.layer.customName = inputs.customName;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            return this.getPublicWorkspaceSchema();
        }).then((publicWorkspaceSchema) => {
            logger.info('LayerImporter#importLayerWithoutMapping. Workspace schema retrieved', publicWorkspaceSchema);
            this._currentImportTask.publicWorkspace = publicWorkspaceSchema.workspace;
            this._currentImportTask.publicSchema = publicWorkspaceSchema.schema;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            let geoServerImporter = new GeoServerImporter(
                config.geoserverHost + config.geoserverPath,
                config.geoserverUsername,
                config.geoserverPassword,
                publicWorkspaceSchema.workspace,
                this._datastore
            );
            return geoServerImporter.importLayer(this._currentImportTask.layer);
        }).then((geoserverImportTaskResults) => {
            logger.info('LayerImporter#importLayerWithoutMapping. Geoserver imported', geoserverImportTaskResults);
            this._currentImportTask.geoserverImportTaskResults = geoserverImportTaskResults;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            if (this._currentImportTask.layer.type === "raster") {
                let rasterToPgsql = new RasterToPGSQL(config.pgDataHost, config.pgDataUser, config.pgDataPassword, config.pgDataDatabase);
                return rasterToPgsql.import(this._currentImportTask.layer);
            }
        }).then(() => {
            logger.info('LayerImporter#importLayerWithoutMapping. RasterToPgsql Finished');
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            return this.storeLayerMetadata(this._currentImportTask.layer.systemName, inputs.user.id);
        }).then(() => {
            logger.info('LayerImporter#importLayerWithoutMapping. Layer metadata stored');
            this._currentImportTask.progress = 100;
            this._currentImportTask.status = "done";
            this._currentImportTask.ended = new Date();
            this._importerTasks.updateTask(this._currentImportTask);
            logger.info(`LayerImporter#importLayerWithoutMapping #### IMPORTED LAYER ${this._currentImportTask.layer.systemName} ####`);
        }).catch(error => {
            this._currentImportTask.status = "error";
            this._currentImportTask.ended = new Date();
            this._currentImportTask.message = error.message;
            this._importerTasks.updateTask(this._currentImportTask);
            logger.error(`LayerImporter#importLayerWithoutMapping`, error);
        })
    }

    /**
     * It stores metadata about the layer in the database.
     * @param path
     * @param metadata
     * @param userId {Number} Id of the current user.
     * @returns {*}
     */
    storeLayerMetadata(path, userId) {
        // TODO: Move recognition of the type elsewhere.
        if(path.indexOf(':') === -1) {
            path = 'geonode:' + path;
        }
        return this._pgLayers.add(path, path, null, null, userId).then(layer => {
            return Promise.all([
                this._pgPermissions.add(userId, PgLayer.type(), layer.id, Permission.DELETE),
                this._pgPermissions.add(userId, PgLayer.type(), layer.id, Permission.READ),
                this._pgPermissions.add(userId, PgLayer.type(), layer.id, Permission.UPDATE)
            ]);
        });
    }

	/**
     * Execute import of the layer without executing the statistical part of the scripts.
     * @param importTask
	 * @param inputs
	 */
	importLayerWithoutStatistics(importTask, inputs) {
		this._currentImportTask = importTask;

		this._currentImportTask.inputs = inputs;

		let totalImportSteps = 8, currentImportStep = 0, mongoLayerReferences;
		this.getBasicMetadataObjects(this._currentImportTask.inputs, this._mongo, this._pgPool).then((pMongoScopes) => {
            logger.info('LayerImporter#importLayerWithoutStatistics. Metadata retrieved.');
			this._currentImportTask.mongoScopes = pMongoScopes;
			this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
			return this.prepareLayerFilesForImport(this._currentImportTask);
		}).then((layer) => {
			logger.info('LayerImporter#importLayerWithoutStatistics. Files prepared', layer);
			this._currentImportTask.layer = layer;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
			return this.getPublicWorkspaceSchema();
		}).then((publicWorkspaceSchema) => {
			logger.info('LayerImporter#importLayerWithoutStatistics. Workspace schema retrieved', publicWorkspaceSchema);
			this._currentImportTask.publicWorkspace = publicWorkspaceSchema.workspace;
			this._currentImportTask.publicSchema = publicWorkspaceSchema.schema;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
			let geoServerImporter = new GeoServerImporter(
				config.geoserverHost + config.geoserverPath,
				config.geoserverUsername,
				config.geoserverPassword,
				publicWorkspaceSchema.workspace,
				this._datastore
			);
			return geoServerImporter.importLayer(this._currentImportTask.layer);
		}).then((geoserverImportTaskResults) => {
			logger.info('LayerImporter#importLayerWithoutStatistics. Geoserver imported', geoserverImportTaskResults);
			this._currentImportTask.geoserverImportTaskResults = geoserverImportTaskResults;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
			return this.prepareAndGetMetadata(this._currentImportTask, this._mongo, this._pgPool);
		}).then((mongoMetadata) => {
			logger.info('LayerImporter#importLayerWithoutStatistics. Metadata prepared', mongoMetadata);
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
			this._currentImportTask.mongoMetadata = mongoMetadata;
            this._importerTasks.updateTask(this._currentImportTask);
			return this.createMongoLayerReferencesAndUpdateTheme(this._currentImportTask, this._mongo);
		}).then((pMongoLayerReferences) => {
            logger.info('LayerImporter#importLayerWithoutStatistics. Import into the database.', mongoLayerReferences);
            mongoLayerReferences = pMongoLayerReferences;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            if (this._currentImportTask.layer.type === "raster") {
                let rasterToPgsql = new RasterToPGSQL(config.pgDataHost, config.pgDataUser, config.pgDataPassword, config.pgDataDatabase);
                return rasterToPgsql.import(this._currentImportTask.layer);
            }
        }).then(() => {
            logger.info('LayerImporter#importLayerWithoutStatistics. RasterToPgsql Finished');
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._currentImportTask.layer.customName = inputs.customName;
            this._importerTasks.updateTask(this._currentImportTask);
            return this.storeLayerMetadata(this._currentImportTask.layer.systemName, inputs.user.id);
        }).then(() => {
			logger.info('LayerImporter#importLayerWithoutStatistics. Created layerrefs', mongoLayerReferences);
			this._currentImportTask.progress = 100;
			this._currentImportTask.mongoLayerReferences = mongoLayerReferences;
			this._currentImportTask.status = "done";
			this._currentImportTask.ended = new Date();
            this._importerTasks.updateTask(this._currentImportTask);
			logger.info(`LayerImporter#importLayerWithoutStatistics #### IMPORTED LAYER ${this._currentImportTask.layer.systemName} ####`);
		}).catch(error => {
			this._currentImportTask.status = "error";
			this._currentImportTask.ended = new Date();
			this._currentImportTask.message = error.message;
            this._importerTasks.updateTask(this._currentImportTask);
			logger.error(`LayerImporter#importLayerWithoutStatistics`, error);
		})
    }

    /**
     * Execute layer import
     * @param importTask
     * @param inputs object with user inputs
     */
    importLayer(importTask, inputs) {
        this._currentImportTask = importTask;

        this._currentImportTask.inputs = inputs;

        let currentImportStep = 0;
        let totalImportSteps = 12;
        
        this.getBasicMetadataObjects(this._currentImportTask.inputs, this._mongo, this._pgPool).then((pMongoScopes) => {
            this._currentImportTask.mongoScopes = pMongoScopes;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            return this.prepareLayerFilesForImport(this._currentImportTask);
        }).then((layer) => {
            this._currentImportTask.layer = layer;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            return this.getPublicWorkspaceSchema();
        }).then((publicWorkspaceSchema) => {
            console.log(publicWorkspaceSchema);
            this._currentImportTask.publicWorkspace = publicWorkspaceSchema.workspace;
            this._currentImportTask.publicSchema = publicWorkspaceSchema.schema;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            let geoServerImporter = new GeoServerImporter(
                config.geoserverHost + config.geoserverPath,
                config.geoserverUsername,
                config.geoserverPassword,
                publicWorkspaceSchema.workspace,
                this._datastore
            );
            return geoServerImporter.importLayer(this._currentImportTask.layer);
        }).then((geoserverImportTaskResults) => {
            this._currentImportTask.geoserverImportTaskResults = geoserverImportTaskResults;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            if (this._currentImportTask.layer.type === "raster") {
                let rasterToPgsql = new RasterToPGSQL(config.pgDataHost, config.pgDataUser, config.pgDataPassword, config.pgDataDatabase);
                return rasterToPgsql.import(this._currentImportTask.layer);
            }
        }).then((rasterToPgsqlOutput) => {
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            if (rasterToPgsqlOutput) {
                this._currentImportTask.rasterToPgsqlOutput = rasterToPgsqlOutput
            }
            return this.prepareAndGetMetadata(this._currentImportTask, this._mongo, this._pgPool);
        }).then((mongoMetadata) => {
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._currentImportTask.mongoMetadata = mongoMetadata;
            this._importerTasks.updateTask(this._currentImportTask);
            return this.analyseLayer(this._currentImportTask, this._mongo, this._pgPool);
        }).then((performedAnalysis) => {
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._currentImportTask.performedAnalysis = performedAnalysis;
            this._importerTasks.updateTask(this._currentImportTask);
            return this.createMongoLayerReferencesAndUpdateTheme(this._currentImportTask, this._mongo);
        }).then((mongoLayerReferences) => {
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._currentImportTask.mongoLayerReferences = mongoLayerReferences;
            this._importerTasks.updateTask(this._currentImportTask);
            return this.updatePgViewWithPerformedAnalysisMongoLayerReferences(this._currentImportTask, this._mongo, this._pgPool);
        }).then(() => {
            logger.info('LayerImporter#importLayerWithoutStatistics. RasterToPgsql Finished');
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._currentImportTask.layer.customName = inputs.customName;
            this._importerTasks.updateTask(this._currentImportTask);
            return this.storeLayerMetadata(this._currentImportTask.layer.systemName, inputs.user.id);
        }).then(() => {
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._importerTasks.updateTask(this._currentImportTask);
            return this.createMongoDataView(this._currentImportTask, this._mongo);
        }).then((mongoDataView) => {
            this._currentImportTask.mongoMetadata.dataView = mongoDataView;
            this._currentImportTask.progress = this.getPercentage(++currentImportStep, totalImportSteps);
            this._currentImportTask.status = "done";
            this._currentImportTask.ended = new Date();
            this._importerTasks.updateTask(this._currentImportTask);
            logger.info(`LayerImporter#importLayer #### IMPORTED LAYER ${this._currentImportTask.layer.systemName} ####`);
        }).catch(error => {
            this._currentImportTask.status = "error";
            this._currentImportTask.ended = new Date();
            this._currentImportTask.message = error.message;
            this._importerTasks.updateTask(this._currentImportTask);
            logger.error(`LayerImporter#importLayer`, error);
        });
    }

    /**
     * Get basic mongo metadata objects ( scope & theme
     * @param inputs object with inputs from wps
     * @param _mongo mongo db connection
     * @param _pgPool postgresql connection pool
     */
    getBasicMetadataObjects(inputs, _mongo, _pgPool) {
        return new Promise((resolve, reject) => {
            let themeIdFilter = inputs.theme;
            let scopeIdFilter = inputs.scope;
            let user = inputs.user;

            let pgPermissions = new PgPermissions(_pgPool, config.postgreSqlSchema);
            pgPermissions.forUser(user.id).then(results => {
                let filter = {
                    resourceType: MongoScope.collectionName(),
                    permission: Permission.UPDATE,
                };
                if (scopeIdFilter) {
                    filter.resourceId = String(scopeIdFilter);
                }
                return _.filter(results, filter);
            }).then(updatableScopes => {
                let filter = {
                    _id: {
                        $in: _.map(updatableScopes, updatableScope => {
                            return Number(updatableScope.resourceId);
                        })
                    },
                    featureLayers: {
                        $gt: []
                    },
                    years: {
                        $gt: []
                    }
                };
                return new FilteredMongoScopes(filter, _mongo).json();
            }).then(updatableScopes => {
                let scopes = {};
                let scopesIds = _.map(updatableScopes, updatableScope => {
                    return updatableScope._id;
                });
                let filter = {
                    dataset: {
                        $in: scopesIds
                    }
                };
                if (themeIdFilter) {
                    filter._id = Number(themeIdFilter);
                }
                return new FilteredMongoThemes(filter, _mongo).json().then(mongoThemes => {
                    _.each(mongoThemes, mongoTheme => {
                        if (themeIdFilter && mongoTheme._id !== Number(themeIdFilter)) return;
                        scopes[Number(mongoTheme.dataset)] = scopes[Number(mongoTheme.dataset)] || _.find(updatableScopes, {_id: mongoTheme.dataset});
                        scopes[Number(mongoTheme.dataset)].themes = scopes[Number(mongoTheme.dataset)].themes || [];
                        scopes[Number(mongoTheme.dataset)].themes.push(mongoTheme);
                    });
                }).then(() => {
                    if (!Object.keys(scopes).length) reject(new Error(`no scopes was found, user is not logged in or has no scopes created`));
                    return scopes;
                })
            }).then(scopes => {
                resolve(scopes);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
     * Run sum and average analysis on layer
     * @param currentProcess current import process object
     * @param _mongo mongo db connection
     * @param _pgPool postgresql connection pool
     */
    analyseLayer(currentProcess, _mongo, _pgPool) {
        return new Promise((resolve, reject) => {
            let layer = currentProcess.layer;
            let analyticalUnitsLayerReferences;
            let analyticalUnits = {};
            let executedAnalysis = [];
            let locationsIds = _.map(currentProcess.mongoMetadata.locations, location => {
                return location._id
            });
            let areaTemplatesFilter = _.union(
                _.flatten(
                    _.concat(
                        [], _.map(
                            currentProcess.mongoScopes, mongoScope => {
                                return mongoScope.featureLayers
                            })
                    )
                )
            );
            let yearFilter = _.union(
                _.flatten(
                    _.concat(
                        [], _.map(
                            currentProcess.mongoScopes, mongoScope => {
                                return mongoScope.years
                            })
                    )
                )
            );
            new FilteredMongoLayerReferences({
                $and: [
                    {
                        areaTemplate: {
                            $in: areaTemplatesFilter
                        }
                    },
                    {
                        year: {
                            $in: yearFilter
                        }
                    },
                    {
                        location: {
                            $in: locationsIds
                        }
                    },
                    {
                        isData: false
                    }
                ]
            }, _mongo).json().then((pAnalyticalUnitsLayerReferences) => {
                if (!pAnalyticalUnitsLayerReferences.length) reject(new Error(`unable to analyse, no analytical units was found`));
                analyticalUnitsLayerReferences = pAnalyticalUnitsLayerReferences;
                _.each(analyticalUnitsLayerReferences, analyticalUnitLayerReference => {
                    analyticalUnits[analyticalUnitLayerReference.layer.split(`:`)[1]] = {
                        layer: analyticalUnitLayerReference.layer,
                        fidColumn: analyticalUnitLayerReference.fidColumn,
                        areaTemplateId: analyticalUnitLayerReference.areaTemplate,
                    }
                });
            }).then(() => {
                    let promises = [];
                    _.each(analyticalUnits, (analyticalUnit, analyticalUnitName) => {
                            let outputAnalysisTable = `${analyticalUnitName}_analysis_${layer.systemName.split(`_`)[0]}`;
                            promises.push(
                                Promise.resolve().then(() => {
                                    let analysis = _.map(currentProcess.mongoMetadata.attributes, attribute => {
                                        return {
                                            type: attribute.analysis,
                                            attribute: `as_${currentProcess.mongoMetadata.attributeSet._id}_attr_${attribute._id}`,
                                            column: attribute.column
                                        }
                                    });
                                    return new LayerAnalysis(_pgPool)
                                        .analyseLayer(
                                            layer,
                                            analyticalUnit,
                                            outputAnalysisTable,
                                            analysis
                                        ).then((queryOutput) => {
                                            return analysis;
                                        })
                                }).then((analysis) => {
                                    executedAnalysis.push({
                                        layer: layer.systemName,
                                        analyticalUnit: analyticalUnitName,
                                        analyticalUnitLayer: analyticalUnit.layer,
                                        analyticalUnitAreaTemplateId: analyticalUnit.areaTemplateId,
                                        analysis: analysis,
                                        outputTable: outputAnalysisTable
                                    })
                                })
                            );
                        }
                    );
                    return Promise.all(promises);
                }
            ).then(() => {
                resolve(executedAnalysis);
            }).catch(error => {
                reject(error);
            });
        })
            ;
    }

    /**
     * Create mongo layer referecnes for analytical unit based on performed analysis
     * @param currentProcess current import process object
     * @param _mongo mongo db connection
     * @param _pgPool postgresql connection pool
     */
    updatePgViewWithPerformedAnalysisMongoLayerReferences(currentProcess, _mongo, _pgPool) {
        return new Promise((resolve, reject) => {
            let pgLayerViews = new PgLayerViews(_pgPool, config.postgreSqlSchemaLayers, config.postgreSqlSchemaLayers);
            let performedAnalysis = currentProcess.performedAnalysis;
            let locationFilter = _.map(currentProcess.mongoMetadata.locations, location => {
                return location._id
            });
            let areaTemplateFilter = _.union(
                _.flatten(
                    _.concat(
                        [], _.map(
                            currentProcess.mongoScopes, mongoScope => {
                                return mongoScope.featureLayers
                            })
                    )
                )
            );
            let yearFilter = _.union(
                _.flatten(
                    _.concat(
                        [], _.map(
                            currentProcess.mongoScopes, mongoScope => {
                                return mongoScope.years
                            })
                    )
                )
            );
            new FilteredMongoLayerReferences({
                $and: [
                    {
                        areaTemplate: {
                            $in: areaTemplateFilter
                        }
                    },
                    {
                        year: {
                            $in: yearFilter
                        }
                    },
                    {
                        location: {
                            $in: locationFilter
                        }
                    },
                    {
                        isData: false
                    }
                ]
            }, _mongo).json().then((baseMongoLayerReferences) => {
                let promises = [];
                _.each(baseMongoLayerReferences, baseMongoLayerReference => {
                    let baseLayerName = baseMongoLayerReference.layer.split(`:`)[1];
                    let dataLayerId = `i${currentProcess.id}`;
                    let layerRegex = `^analysis:${baseLayerName}_analysis_${dataLayerId}$`;
                    let filter = {
                        $and: [
                            {isData: true},
                            {areaTemplate: baseMongoLayerReference.areaTemplate},
                            {location: baseMongoLayerReference.location},
                            {year: baseMongoLayerReference.year},
                            {layer: {$regex: layerRegex}}
                        ]
                    };
                    promises.push(new FilteredMongoLayerReferences(filter, _mongo).read().then(dataLayerReferences => {
                            return pgLayerViews.update(baseMongoLayerReference._id, dataLayerReferences);
                        })
                    );
                });
                Promise.all(promises).then(() => {
                    resolve();
                }).catch(error => {
                    reject(error);
                })
            });
        });
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

    /**
     * Prepare and get metadata for imported layer
     * @param currentProcess current import process object
     * @param _mongo mongo db connection
     * @param _pgPool postgresql connection pool
     */
    prepareAndGetMetadata(currentProcess, _mongo, _pgPool) {
        return new Promise((resolve, reject) => {
            let topic, layerGroup, attributes = [], attributeSet, layerTemplate, locations = [];

            let scopes = currentProcess.mongoScopes;
            let layer = currentProcess.layer;
            let user = currentProcess.inputs.user;
            let layerGroupName = "Custom Layers";

            let mongoTopics = new MongoTopics(_mongo);
            let mongoLayerGroups = new MongoLayerGroups(_mongo);
            let pgPermissions = new PgPermissions(_pgPool, config.postgreSqlSchema);

            let geoserverImportTaskResults = currentProcess.geoserverImportTaskResults;

            topic = {
                _id: conn.getNextId(),
                name: `${layer.customName}`,
                active: true,
                origin: `customLayer`
            };

            new FilteredMongoLocations({
                dataset: {
                    $in: _.map(scopes, scope => {
                        return scope._id
                    })
                }
            }, _mongo).json().then(pLocations => {
                locations = pLocations;
                return mongoTopics.add(topic);
            }).then((result) => {
                if (!result.insertedCount) reject(new Error(`topic was not created`));
                return Promise.all([
                    pgPermissions.add(user.id, MongoTopic.collectionName(), topic._id, Permission.READ),
                    pgPermissions.add(user.id, MongoTopic.collectionName(), topic._id, Permission.UPDATE),
                    pgPermissions.add(user.id, MongoTopic.collectionName(), topic._id, Permission.DELETE)
                ]);
            }).then(() => {
                return pgPermissions.forUser(user.id)
            }).then((userPermissions) => {
                let promises = [];
                _.each(userPermissions, userPermission => {
                    if (userPermission.resourceType === MongoLayerGroup.collectionName() && userPermission.permission === Permission.UPDATE) {
                        promises.push(
                            new FilteredMongoLayerGroups({_id: Number(userPermission.resourceId)}, _mongo).json().then(mongoLayerGroups => {
                                if (mongoLayerGroups.length) {
                                    return mongoLayerGroups;
                                }
                            })
                        )
                    }
                });
                return Promise.all(promises);
            }).then((mongoLayerGroupsResults) => {
                _.each(mongoLayerGroupsResults, mongoLayerGroups => {
                    if (mongoLayerGroups) {
                        _.each(mongoLayerGroups, mongoLayerGroup => {
                            if (!layerGroup && mongoLayerGroup && mongoLayerGroup.name === layerGroupName) {
                                layerGroup = mongoLayerGroup;
                            }
                        });
                    }
                });
            }).then(() => {
                if (!layerGroup) {
                    layerGroup = {
                        _id: conn.getNextId(),
                        name: layerGroupName,
                        origin: `customLayer`,
                        priority: 999,
                        active: true
                    };
                    return mongoLayerGroups.add(layerGroup).then((result) => {
                        if (!result.insertedCount) reject(new Error(`layer group was not created`));
                        return Promise.all([
                            pgPermissions.add(user.id, MongoLayerGroup.collectionName(), layerGroup._id, Permission.READ),
                            pgPermissions.add(user.id, MongoLayerGroup.collectionName(), layerGroup._id, Permission.UPDATE),
                            pgPermissions.add(user.id, MongoLayerGroup.collectionName(), layerGroup._id, Permission.DELETE)
                        ]);
                    });
                }
            }).then(() => {
                let promises = [];
                let attributeTypes = [`sum`, `avg`];

                if (layer.type === "raster") {
                    _.each(attributeTypes, attributeType => {
                        attributes.push({
                            _id: conn.getNextId(),
                            name: `band 1 ${attributeType}`,
                            active: true,
                            origin: `customLayer`,
                            type: `numeric`,
                            analysis: attributeType
                        });
                    });
                } else if (layer.type === "vector") {
                    _.each(attributeTypes, attributeType => {
                        _.each(geoserverImportTaskResults[0].attributes, attribute => {
                            if (this.isVectorLayerAttributeNumeric(attribute)) {
                                attributes.push({
                                    _id: conn.getNextId(),
                                    name: `${attribute.name} ${attributeType}`,
                                    active: true,
                                    origin: `customLayer`,
                                    type: `numeric`,
                                    analysis: attributeType,
                                    column: attribute.name
                                });
                            }
                        });
                    });
                }

                if (!attributes.length) {
                    throw new Error(`no attributes was prepared`);
                }

                let mongoAttributes = new MongoAttributes(_mongo);
                _.each(attributes, attribute => {
                    promises.push(mongoAttributes.add(attribute));
                    promises.push(pgPermissions.add(user.id, MongoAttribute.collectionName(), attribute._id, Permission.READ));
                    promises.push(pgPermissions.add(user.id, MongoAttribute.collectionName(), attribute._id, Permission.UPDATE));
                    promises.push(pgPermissions.add(user.id, MongoAttribute.collectionName(), attribute._id, Permission.DELETE));
                });

                return Promise.all(promises).then((results) => {
                    _.each(results, result => {
                        if (!result.command && !result.insertedCount) {
                            throw new Error(`attribute was not created`);
                        }
                    });
                });
            }).then(() => {
                attributeSet = {
                    _id: conn.getNextId(),
                    name: `${layer.customName} attributes`,
                    active: true,
                    origin: `customLayer`,
                    topic: topic._id,
                    attributes: _.map(attributes, attribute => {
                        return attribute._id
                    })
                };
                return new MongoAttributeSets(_mongo).add(attributeSet).then((result => {
                    if (!result.insertedCount) reject(new Error(`attribute set was not created`));
                }));
            }).then(() => {
                layerTemplate = {
                    _id: conn.getNextId(),
                    name: `${layer.customName}`,
                    topic: topic._id,
                    layerGroup: layerGroup._id,
                    active: true,
                    origin: `customLayer`,
                    layerType: `${layer.type}`
                };
                return new MongoLayerTemplates(_mongo).add(layerTemplate).then((result) => {
                    if (!result.insertedCount) reject(new Error(`layer template was not created`));
                });
            }).then(() => {
                resolve({
                    topic: topic,
                    layerGroup: layerGroup,
                    attributes: attributes,
                    attributeSet: attributeSet,
                    layerTemplate: layerTemplate,
                    locations: locations
                })
            }).catch(error => {
                reject(error);
            });
        })
    }

    /**
     * Create mongo layer references for given layer and update mongo theme with layer's topic
     * @param currentProcess current import process object
     * @param _mongo mongo db connection
     * @returns {*|Promise}
     */
    createMongoLayerReferencesAndUpdateTheme(currentProcess, _mongo) {
        return new Promise((resolve, reject) => {
            let user = currentProcess.inputs.user;
            let layer = currentProcess.layer;
            let scopes = currentProcess.mongoScopes;
            let topic = currentProcess.mongoMetadata.topic;
            let locations = currentProcess.mongoMetadata.locations;
            let layerTemplate = currentProcess.mongoMetadata.layerTemplate;
            let workspace = currentProcess.publicWorkspace;
            let attributeSet = currentProcess.mongoMetadata.attributeSet;
            let attributes = currentProcess.mongoMetadata.attributes;
            let performedAnalysis = currentProcess.performedAnalysis;

            let mongoLayerReferences = new MongoLayerReferences(this._mongo);
            let pgPermissions = new PgPermissions(this._pgPool, config.postgreSqlSchema);

            let layerReferences = [];
            let layerReferencesPermissions = [];

            _.each(scopes, scope => {
                _.each(_.filter(locations, {dataset: scope._id}), location => {
                    _.each(scope.years, yearId => {
                        layerReferences.push({
                            _id: conn.getNextId(),
                            active: true,
                            areaTemplate: layerTemplate._id,
                            columnMap: [],
                            isData: false,
                            layer: `${workspace}:${layer.systemName}`,
                            location: location._id,
                            year: yearId,
                            origin: `customLayer`,
                        });

                        _.each(performedAnalysis, performedAnalysisResult => {
                            layerReferences.push({
                                _id: conn.getNextId(),
                                location: location._id,
                                year: yearId,
                                areaTemplate: performedAnalysisResult.analyticalUnitAreaTemplateId,
                                isData: true,
                                fidColumn: "gid",
                                layer: `analysis:${performedAnalysisResult.outputTable}`,
                                attributeSet: attributeSet._id,
                                columnMap: _.map(attributes, attribute => {
                                    return ({
                                        column: `as_${attributeSet._id}_attr_${attribute._id}`,
                                        attribute: attribute._id
                                    })
                                }),
                                origin: `customLayer`,
                            });
                        })
                    })
                });
            });

            Promise.all(_.map(layerReferences, layerReference => {
                layerReferencesPermissions.concat([
                    pgPermissions.add(user.id, MongoLayerReference.collectionName(), layerReference._id, Permission.READ),
                    pgPermissions.add(user.id, MongoLayerReference.collectionName(), layerReference._id, Permission.UPDATE),
                    pgPermissions.add(user.id, MongoLayerReference.collectionName(), layerReference._id, Permission.DELETE)
                ]);
                return mongoLayerReferences.add(layerReference);
            })).then(() => {
                return Promise.all(layerReferencesPermissions);
            }).then(() => {
                let promises = [];
                let themes = _.union(
                    _.flatten(
                        _.concat(
                            [], _.map(
                                currentProcess.mongoScopes, mongoScope => {
                                    return mongoScope.themes
                                })
                        )
                    )
                );
                _.each(themes, theme => {
                    let topics = theme.topics || [];
                    topics.push(topic._id);
                    promises.push(
                        _mongo.collection(
                            MongoTheme.collectionName()
                        ).update({_id: theme._id}, {$set: {topics: topics}}));
                });
                return Promise.all(promises);
            }).then(() => {
                resolve(layerReferences);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
     * Download layer from given url and prepare it for import to Geoserver
     * @param importerTask importer task object
     */
    prepareLayerFilesForImport(importerTask) {
        let importFolderPath, fileExtension, sourceFileName, systemLayerName, customLayerName, layerType, filePath;
        return new Promise((resolve, reject) => {
            importFolderPath = `${config.temporaryDownloadedFilesLocation}layerImport_${importerTask.id}/`;
            fs.mkdir(importFolderPath, error => {
                if (error) reject(error);
                resolve();
            });
        }).then(() => {
            fileExtension = path.extname(importerTask.inputs.url || importerTask.inputs.file);
            sourceFileName = path.basename(importerTask.inputs.url || importerTask.inputs.name, fileExtension);
            customLayerName = importerTask.inputs.customName || sourceFileName;
            systemLayerName = `i${importerTask.id}_${customLayerName.toLowerCase().substring(0, 50).replace(/[|&;$%@"<>()+, ]/g, "_")}`;
            filePath = `${importFolderPath}${sourceFileName}${fileExtension}`;
            logger.info(`LayerImporter#prepareLayerFilesForImport FileExtension: ${fileExtension}, SourceFileName: ${sourceFileName}, 
                CustomLayerName: ${customLayerName}, SystemLayerName: ${systemLayerName}, FilePath: ${filePath}
            `);

            if (importerTask.inputs.url) {
                return new Promise((resolve, reject) => {
                    let output = fs.createWriteStream(filePath);
                    request.get(importerTask.inputs.url)
                        .on('error', error => {
                            reject(error);
                        })
                        .pipe(output)
                        .on('finish', () => {
                            resolve();
                        })
                        .on('error', error => {
                            reject(error);
                        });
                })
            } else if (importerTask.inputs.file) {
                return Promise.resolve().then(() => {
                    fs.renameSync(importerTask.inputs.file, filePath);
                })
            }
        }).then(() => {
            logger.info(`LayerImporter#prepareLayerFilesForImport Unzip`);
            return new Promise((resolve, reject) => {
                if (fileExtension.toLowerCase() === '.zip') {
                    let fsRs = fs.createReadStream(filePath).pipe(unzip.Extract({
                        path: importFolderPath
                    }).on('close', () => {
                        fs.unlink(filePath, error => {
                            if (error) reject(error);
                            resolve();
                        });
                    })).on('error', error => {
                        reject(error);
                    });
                } else {
                    resolve();
                }
            });
        }).then(() => {
            logger.info(`LayerImporter#prepareLayerFilesForImport Rename`);
            return new Promise((resolve, reject) => {
                fs.readdir(importFolderPath, (error, files) => {
                    if (error) reject(error);

                    _.each(files, file => {
                        let ext = path.extname(`${importFolderPath}${file}`).toLowerCase();
                        fs.renameSync(`${importFolderPath}${file}`, `${importFolderPath}${systemLayerName}${ext}`);
                        if (ext.includes("tif")) {
                            layerType = "raster"
                        } else if (ext.includes("shp")) {
                            layerType = "vector";
                        }
                    });

                    if (!layerType) {
                        reject(new Error(`unknown file, shp or geotiff is expected`));
                    } else {
                        resolve();
                    }
                })
            });
        }).then(() => {
            logger.info(`LayerImporter#prepareLayerFilesForImport Read All`);
            return new Promise((resolve, reject) => {
                fs.readdir(importFolderPath, (error, files) => {
                    if (error) reject(error);
                    _.each(files, file => {
                        fs.chmodSync(`${importFolderPath}${file}`, 511);
                    });
                    resolve(files);
                });
            });
		}).then((files) => {
            logger.info(`LayerImporter#prepareLayerFilesForImport DBF Update`);
            let dbfEditor = new DBFEditor();
			let file = _.filter(files, (file) => {
				return file.toLowerCase().endsWith('.dbf');
			});
			if(file.length > 0) {
                return dbfEditor.prepareDbfFileForImport(`${importFolderPath}/${file}`).then(() => {
                    return files;
                });
            } else {
			    return files;
            }
        }).then((files) => {
            logger.info(`LayerImporter#prepareLayerFilesForImport Finished`);
            return ({
				customName: customLayerName,
				systemName: systemLayerName,
				files: files,
				directory: importFolderPath,
				type: layerType
			});
        });
    }

    /**
     * check if java data type is numeric
     * @param attribute
     * @returns {boolean}
     */
    isVectorLayerAttributeNumeric(attribute) {
        switch (attribute.binding) {
            case `java.lang.Integer`:
                return true;
            case `java.lang.Long`:
                return true;
            case `java.lang.Double`:
                return true;
            case `java.lang.Float`:
                return true;
            default:
                return false;
        }
    }

    /**
     * Return percentage from given values
     * @param current
     * @param max
     * @returns {*}
     */
    getPercentage(current, max) {
        return Math.floor(current / max * 100);
    }

    /**
     * Create mongo dataview for imported layer
     * @param currentImportTask
     * @param mongo
     */
    createMongoDataView(currentImportTask, mongo) {
        let mongoScope = currentImportTask.mongoScopes[Object.keys(currentImportTask.mongoScopes)[0]];
        let mongoLocation = _.find(currentImportTask.mongoMetadata.locations, {dataset: mongoScope._id});
        let analyticalUnitId = mongoScope.featureLayers[0];
        let attributeSet = currentImportTask.mongoMetadata.attributeSet;
        let attributes = currentImportTask.mongoMetadata.attributes;
        let baseView = {
            _id: conn.getNextId(),
            name: currentImportTask.layer.customName,
            conf: {
                multipleMaps: false,
                years: mongoScope.years,
                dataset: mongoScope._id,
                theme: mongoScope.themes[0]._id,
                visualization: null,
                location: mongoLocation._id,
                expanded: {},
                selMap: {
                    ff4c39: []
                },
                choroplethCfg: [],
                pagingUseSelected: false,
                pagingSelectedColors: [
                    "ff4c39",
                    "34ea81",
                    "39b0ff",
                    "ffde58",
                    "5c6d7e",
                    "d97dff"
                ],
                filterMap: {},
                filterActive: false,
                layers: [
                    {
                        opacity: 0.7,
                        sortIndex: 0,
                        type: "selectedareasfilled",
                        attributeSet: "",
                        attribute: "",
                        at: "",
                        symbologyId: ""
                    },
                    {
                        opacity: 0.7,
                        sortIndex: 1,
                        type: "areaoutlines",
                        attributeSet: "",
                        attribute: "",
                        at: "",
                        symbologyId: ""
                    },
                    {
                        opacity: 0.7,
                        sortIndex: 2,
                        type: "topiclayer",
                        attributeSet: "",
                        attribute: "",
                        at: currentImportTask.mongoMetadata.layerTemplate._id,
                        symbologyId: "#blank#"
                    },
                    {
                        opacity: 1,
                        sortIndex: 10000,
                        type: "terrain",
                        attributeSet: "",
                        attribute: "",
                        at: "",
                        symbologyId: ""
                    }
                ],
                trafficLayer: false,
                page: 1,
                mapCfg: {
                    center: {},
                    zoom: 6
                },
                cfgs: [
                    {
                        cfg: {
                            title: "Automatic analysis results",
                            type: "grid",
                            attrs: _.map(attributes, attribute => {
                                return {
                                    as: attributeSet._id,
                                    attr: attribute._id,
                                    normType: "",
                                    normAs: "",
                                    normAttr: "",
                                    normYear: "",
                                    attrNameNormalized: "",
                                    checked: true,
                                    numCategories: "",
                                    classType: "",
                                    zeroesAsNull: "",
                                    name: "",
                                    topic: "",
                                    parentId: null,
                                    index: 0,
                                    depth: 0,
                                    expanded: false,
                                    expandable: true,
                                    leaf: false,
                                    cls: "",
                                    iconCls: "",
                                    icon: "",
                                    root: false,
                                    isLast: false,
                                    isFirst: false,
                                    allowDrop: true,
                                    allowDrag: true,
                                    loaded: false,
                                    loading: false,
                                    href: "",
                                    hrefTarget: "",
                                    qtip: "",
                                    qtitle: "",
                                    children: null,
                                    attrName: `${attribute.name}`,
                                    asName: `${attributeSet.name}`,
                                    treeNodeText: `${attribute.name}`
                                }
                            }),
                            featureLayerOpacity: "70",
                            classType: "quantiles",
                            numCategories: "5",
                            constrainFl: [
                                0,
                                3
                            ],
                            stacking: "none",
                            chartId: 7165535
                        },
                        queryCfg: {
                            invisibleAttrs: [],
                            invisibleYears: []
                        }
                    }
                ]
            },
            origin: "customLayer"
        };

        return new MongoDataViews(mongo).add(baseView).then(() => {
            return baseView;
        })
    }
}

module.exports = LayerImporter;