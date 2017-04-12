let Promise = require('promise');
let request = require('superagent');
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let unzip = require('unzip');

let conn = require('../common/conn');
let config = require('../config');
let utils = require('../tacrpha/utils');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
let FilteredMongoThemes = require('../metadata/FilteredMongoThemes');
let FilteredMongoLayerGroups = require('../metadata/FilteredMongoLayerGroups');
let FilteredMongoLayerTemplates = require('../layers/FilteredMongoLayerTemplates');
let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
let GeoServerImporter = require('../layers/GeoServerImporter');
let PgTable = require('../data/PgTable');
let MongoAttribute = require('../attributes/MongoAttribute');
let MongoAttributes = require('../attributes/MongoAttributes');
let MongoAttributeSet = require('../attributes/MongoAttributeSet');
let MongoAttributeSets = require('../attributes/MongoAttributeSets');
let MongoLayerReferences = require('../layers/MongoLayerReferences');
let MongoLayerReference = require('../layers/MongoLayerReference');
let MongoLayerTemplates = require('../layers/MongoLayerTemplates');
let MongoLayerTemplate = require('../layers/MongoLayerTemplate');
let MongoLayerGroups = require('../layers/MongoLayerGroups');
let MongoLayerGroup = require('../layers/MongoLayerGroup');
let MongoTopics = require('../metadata/MongoTopics');
let MongoTopic = require('../metadata/MongoTopic');
let MongoThemes = require('../metadata/MongoThemes');
let MongoTheme = require('../metadata/MongoTheme');
let MongoScope = require('../metadata/MongoScope');
let GeonodeUpdateLayers = require('../layers/GeonodeUpdateLayers');
let PgBaseLayerTables = require('../layers/PgBaseLayerTables');
let PgLayerViews = require('../layers/PgLayerViews');
let RasterToPGSQL = require('../integration/RasterToPGSQL');
let PgPermissions = require('../security/PgPermissions');
let LayerAnalysis = require('../analysis/spatial/LayerAnalysis');
let Permissions = require('../security/Permission');

class LayerImporter {
    constructor(pgPool, mongo, importerTasks) {
        this._pgPool = pgPool;
        this._mongo = mongo;
        this._importerTasks = importerTasks;
        this._currentImportTask = {};
    }
    
    /**
     * Return current import task
     * @returns current import task
     */
    getCurrentImporterTask() {
        return this._currentImportTask;
    }
    
    /**
     * Execute layer import
     * @param inputs object with user inputs
     */
    importLayer(inputs) {
        this._currentImportTask = this._importerTasks.createNewImportTask();
        
        this._currentImportTask.inputs = inputs;
        
        this.getBasicMetadataObjects(this._currentImportTask.inputs, this._mongo).then((basicMetadata) => {
            this._currentImportTask.basicMongoMetadata = basicMetadata;
            this._currentImportTask.progress = 10;
            return this.prepareLayerFilesForImport(this._currentImportTask);
        }).then((layer) => {
            this._currentImportTask.layer = layer;
            this._currentImportTask.progress = 20;
            return this.getPublicWorkspaceSchema();
        }).then((publicWorkspaceSchema) => {
            this._currentImportTask.publicWorkspace = publicWorkspaceSchema.workspace;
            this._currentImportTask.publicSchema = publicWorkspaceSchema.schema;
            this._currentImportTask.progress = 30;
            // todo get datastore from configuration
            let geoServerImporter = new GeoServerImporter(
                config.geoserverHost + config.geoserverPath,
                config.geoserverUsername,
                config.geoserverPassword,
                publicWorkspaceSchema.workspace,
                "datastore"
            );
            return geoServerImporter.importLayer(this._currentImportTask.layer);
        }).then((geoserverImportTaskResults) => {
            this._currentImportTask.geoserverImportTaskResults = geoserverImportTaskResults;
            this._currentImportTask.progress = 40;
            let geonodeUpdateLayers = new GeonodeUpdateLayers();
            return geonodeUpdateLayers.filtered({layer: this._currentImportTask.layer.systemName});
        }).then(() => {
            this._currentImportTask.progress = 50;
            if (this._currentImportTask.layer.type === "raster") {
                let rasterToPgsql = new RasterToPGSQL(config.pgDataHost, config.pgDataUser, config.pgDataPassword, config.pgDataDatabase);
                return rasterToPgsql.import(this._currentImportTask.layer);
            }
        }).then((rasterToPgsqlOutput) => {
            this._currentImportTask.progress = 60;
            if (rasterToPgsqlOutput) {
                this._currentImportTask.rasterToPgsqlOutput = rasterToPgsqlOutput
            }
            return this.prepareAndGetMetadata(this._currentImportTask, this._mongo, this._pgPool);
        }).then((mongoMetadata) => {
            this._currentImportTask.progress = 70;
            this._currentImportTask.mongoMetadata = mongoMetadata;
            return this.analyseLayer(this._currentImportTask, this._mongo, this._pgPool);
        }).then((performedAnalysis) => {
            this._currentImportTask.progress = 80;
            this._currentImportTask.performedAnalysis = performedAnalysis;
            return this.createMongoLayerReferencesAndUpdateTheme(this._currentImportTask, this._mongo);
        }).then((mongoLayerReferences) => {
            this._currentImportTask.progress = 90;
            this._currentImportTask.mongoLayerReferences = mongoLayerReferences;
            return this.updatePgViewWithPerformedAnalysisMongoLayerReferences(this._currentImportTask, this._mongo, this._pgPool);
        }).then(() => {
            this._currentImportTask.progress = 100;
            this._currentImportTask.status = "done";
            console.log(`#### IMPORTED LAYER ${this._currentImportTask.layer.systemName} ####`);
        }).catch(error => {
            this._currentImportTask.status = "error";
            this._currentImportTask.message = error.message;
            console.log(`#9`, error);
        });
    }
    
    /**
     * Get basic mongo metadata objects ( scope & theme
     * @param inputs object with inputs from wps
     * @param _mongo mongo db connection
     */
    getBasicMetadataObjects(inputs, _mongo) {
        return new Promise((resolve, reject) => {
            let themeId = inputs.theme;
            let scopeId = inputs.scope;
            
            let theme, scope, analyticalUnits;
            
            if (!themeId) {
                reject(new Error(`theme id is not specified`));
            }
            if (!scopeId) {
                reject(new Error(`scope id is not specified`));
            }
            
            new MongoScope(Number(scopeId), _mongo).json().then((pScope) => {
                if (!pScope) reject(new Error(`scope was not found`));
                if (!pScope.featureLayers.length) reject(new Error(`selected scope has no analytical units`));
                scope = pScope;
                analyticalUnits = pScope.featureLayers;
            }).then(() => {
                return new MongoTheme(Number(themeId), _mongo).json().then((pTheme) => {
                    if (!pTheme) reject(new Error(`theme was not found`));
                    theme = pTheme;
                })
            }).then(() => {
                // todo check if user has correct rights
                resolve({
                    scope: scope,
                    theme: theme,
                    analyticalUnits: analyticalUnits
                })
            })
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
            new FilteredMongoLayerReferences({
                $and: [
                    {
                        areaTemplate: {
                            $in: currentProcess.basicMongoMetadata.analyticalUnits
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
                if(!pAnalyticalUnitsLayerReferences.length) reject(new Error(`unable to analyse, no analytical units was found`));
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
                                        ).then(() => {
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
            let pgLayerViews = new PgLayerViews(_pgPool, config.postgreSqlSchemaLayers);
            let performedAnalysis = currentProcess.performedAnalysis;
            new FilteredMongoLayerReferences({
                $and: [
                    {isData: false},
                    {
                        areaTemplate: {
                            $in: _.map(performedAnalysis, performedAnalysis => {
                                return performedAnalysis.analyticalUnitAreaTemplateId
                            })
                        }
                    }]
            }, _mongo).json().then((baseMongoLayerReferences) => {
                let promises = [];
                _.each(baseMongoLayerReferences, baseMongoLayerReference => {
                    promises.push(new FilteredMongoLayerReferences({
                            $and: [
                                {isData: true},
                                {areaTemplate: baseMongoLayerReference.areaTemplate},
                                {location: baseMongoLayerReference.location},
                                {year: baseMongoLayerReference.year}
                            ]
                        }, _mongo).read().then(dataLayerReferences => {
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
                if (schema === "public") {
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
            
            let scope = currentProcess.basicMongoMetadata.scope;
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
            
            new FilteredMongoLocations({dataset: scope._id}, _mongo).json().then(pLocations => {
                locations = pLocations;
                return mongoTopics.add(topic);
            }).then((result) => {
                if (!result.insertedCount) reject(new Error(`topic was not created`));
                return Promise.all([
                    pgPermissions.add(user.id, MongoTopic.collectionName(), topic._id, Permissions.READ),
                    pgPermissions.add(user.id, MongoTopic.collectionName(), topic._id, Permissions.UPDATE),
                    pgPermissions.add(user.id, MongoTopic.collectionName(), topic._id, Permissions.DELETE)
                ]);
            }).then(() => {
                return pgPermissions.forUser(user.id)
            }).then((userPermissions) => {
                let promises = [];
                _.each(userPermissions, userPermission => {
                    if (userPermission.resourceType === MongoLayerGroup.collectionName() && userPermission.permission === Permissions.UPDATE) {
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
                            pgPermissions.add(user.id, MongoLayerGroup.collectionName(), layerGroup._id, Permissions.READ),
                            pgPermissions.add(user.id, MongoLayerGroup.collectionName(), layerGroup._id, Permissions.UPDATE),
                            pgPermissions.add(user.id, MongoLayerGroup.collectionName(), layerGroup._id, Permissions.DELETE)
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
                    promises.push(pgPermissions.add(user.id, MongoAttribute.collectionName(), attribute._id, Permissions.READ));
                    promises.push(pgPermissions.add(user.id, MongoAttribute.collectionName(), attribute._id, Permissions.UPDATE));
                    promises.push(pgPermissions.add(user.id, MongoAttribute.collectionName(), attribute._id, Permissions.DELETE));
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
            let scope = currentProcess.basicMongoMetadata.scope;
            let theme = currentProcess.basicMongoMetadata.theme;
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
            _.each(locations, location => {
                _.each(scope.years, year => {
                    layerReferences.push({
                        _id: conn.getNextId(),
                        active: true,
                        areaTemplate: layerTemplate._id,
                        columnMap: [],
                        isData: false,
                        layer: `${workspace}:${layer.systemName}`,
                        location: location._id,
                        year: year
                    });
                });
            });
            
            _.each(locations, location => {
                _.each(scope.years, year => {
                    _.each(performedAnalysis, performedAnalysisResult => {
                        layerReferences.push({
                            _id: conn.getNextId(),
                            location: location._id,
                            year: year,
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
                            })
                        });
                    })
                })
            });
            
            Promise.all(_.map(layerReferences, layerReference => {
                layerReferencesPermissions.concat([
                    pgPermissions.add(user.id, MongoLayerReference.collectionName(), layerReference._id, Permissions.READ),
                    pgPermissions.add(user.id, MongoLayerReference.collectionName(), layerReference._id, Permissions.UPDATE),
                    pgPermissions.add(user.id, MongoLayerReference.collectionName(), layerReference._id, Permissions.DELETE)
                ]);
                return mongoLayerReferences.add(layerReference);
            })).then(() => {
                return Promise.all(layerReferencesPermissions);
            }).then(() => {
                let topics = theme.topics;
                topics.push(topic._id);
                let mongoCollection = this._mongo.collection(MongoTheme.collectionName());
                return mongoCollection.update({_id: theme._id}, {$set: {topics: topics}});
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
            return new Promise((resolve, reject) => {
                fs.readdir(importFolderPath, (error, files) => {
                    if (error) reject(error);
                    resolve({
                        customName: customLayerName,
                        systemName: systemLayerName,
                        files: files,
                        directory: importFolderPath,
                        type: layerType
                    });
                });
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
}

module
    .exports = LayerImporter;