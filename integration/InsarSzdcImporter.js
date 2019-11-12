const zipper = require(`zip-local`);
const uuidv4 = require(`uuid/v4`);
const _ = require(`lodash`);
const fse = require(`fs-extra`);
const child_process = require(`child_process`);

const config = require(`../config`);

const PgApplicationsCrud = require(`../application/PgApplicationsCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);

const APPLICATION_KEY = "szdcInsar19";
const BASIC_PERIOD_DAYS = [90, 180, 365, 1400];

const VARIABLE_DEFINITIONS = {
	t168: {
		VAR: "VEL_AVG",
		SVAR: "VEL_ACC"
	},
	t95: {
		VAR: "VEL_AVG",
		SVAR: "VEL_ACC"
	},
	t44: {
		VAR: "VEL_AVG",
		SVAR: "VEL_ACC"
	}
};

const FID_COLUMN = "ID";

const ATTRIBUTE_DEFINITIONS = {
	VEL_AVG: {
		description: "průměrná rychlost [mm/r]"
	},
	VEL_SD: {
		description: "směrodatná odchylka rychlosti [mm/r], nereálná hodnota"
	},
	VEL_ACC: {
		description: "směrodatná odchylka rychlosti [mm/r], reálná hodnota, vyčíslená z rozptylu rychlosti pro body mimo trať (za předpokladu všeobecné stability)"
	},
	S0: {
		description: "směrodatná odchylka polohy (jednoho měření) [mm]"
	},
	VEL_CUM: {
		description: "celkový pohyb [mm] za celou dobu sledování, obecně za jinou dobu pro každý track"
	},
	COH: {
		description: "koherence, 1 pro velmi kvalitní body, 0 pro body nekvalitní; body s koherencí < 0.4 byly vyloučeny"
	},
	CL_PRG: {
		description: "trend pohybu pro daný bod za celou dobu sledování: STABILITY/UPLIFT/SUBSIDENCE/OSCILLATION"
	},
	CL_DYN: {
		description: "dynamický trend pohybu pro daný bod za celou dobu sledování: CONST_TREND/ACCELLERATION/DECCELLERATION/NO_CLASS"
	},
	CL_JMP: {
		description: "jedno- či dvouciferné číslo reprezentující jednorázové změny polohy. Jednotky udávají počet jednorázových změn (skoků) nahoru, desítky počet skoků směrem dolů. (nejde + a -?)"
	},
	CL_NOISE: {
		description: "jedno- či dvouciferné číslo reprezentující změny úrovní šumu. Jednotky udávají počet zvýšení hladiny šumu, desítky počet snížení hladiny šumu. (nejde + a -?)"
	},
	CL_UE: {
		description: "Číslo reprezentující pravděpodobnost chyby z rozbalení fáze pro časový průběh daného bodu (na základě pouze časové informace), vždy >=0, vždy <=1"
	},
	CORR_UE: {
		description: "Počet opravených chyb z rozbalení fáze v daném průběhu"
	},
	VEL_LAST: {
		description: "Rychlost [mm/r] v posledním klasifikovaném úseku"
	},
	SVEL_LAST: {
		description: "Sm. odchylka rychlosti (reálná hodnota, [mm/r]) v posledním klasifikovaném úseku"
	},
	TD_LAST: {
		description: "Celkový posun (total displacement) [mm] v posledním klasifikovaném úseku (pozn. tento klasifikovaný úsek je pro každý bod obecně jinak dlouhý!)"
	},
	STD_LAST: {
		description: "Sm. odchylka [mm] celkového pohybu v posledním klasifikovaném úseku"
	},
	CL_TEMPC: {
		description: "korelační koeficient mezi časovým průběhem a přibližnými teplotami, udává možnost dilatace daného bodu vlivem teploty: VERY WEAK/WEAK/MODERATE/STRONG/VERY STRONG"
	},
	DIL_C: {
		description: "odhad dilatačního koeficientu [mm/degC] pro body s CL_TEMPC jiné než VERY WEAK"
	},
	TD_90: {
		description: "celkový posun v LOS [mm] za posledních 90 dnů sledování"
	},
	TD_180: {
		description: "celkový posun v LOS [mm] za posledních 180 dnů sledování"
	},
	TD_365: {
		description: "celkový posun v LOS [mm] za posledních 365 dnů sledování"
	},
	TD_1400: {
		description: "celkový posun v LOS [mm] za posledních 1400 dnů sledování"
	},
	STD_90: {
		description: "sm. odchylka [mm] celkového posunu za posledních 90 dnů sledování"
	},
	STD_180: {
		description: "sm. odchylka [mm] celkového posunu za posledních 180 dnů sledování"
	},
	STD_365: {
		description: "sm. odchylka [mm] celkového posunu za posledních 365 dnů sledování"
	},
	STD_1400: {
		description: "sm. odchylka [mm] celkového posunu za posledních 1400 dnů sledování"
	},
	d_: {
		description: "hodnota polohy daného bodu [mm] pro dané datum",
		regex: /d_[0-9]*/
	},
	m_: {
		description: "modelová poloha daného bodu [mm] pro dané datum",
		regex: /m_[0-9]*/
	},
	s_: {
		description: "vyhlazená hodnota polohy daného bodu [mm] pro dané datum",
		regex: /s_[0-9]*/
	}
};

class InsarSzdcImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgApplicationsCrud = new PgApplicationsCrud(pgPool, config.pgSchema.application);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);
	}

	import(data, user, status) {
		let unzippedFileSystem;
		let processData = {};

		user.groups.push({id: 1, name: "admin"});

		return Promise
			.resolve()
			.then(() => {
				unzippedFileSystem = zipper.sync.unzip(data.path).memory();
			})
			.then(() => {
				return this.analyzeInputData(unzippedFileSystem)
					.then((analyzeResults) => {
						processData.analyzeResults = analyzeResults;
					})
			})
			.then(() => {
				return this.ensureApplication(user)
					.then((application) => {
						processData.application = application;
					})
			})
			.then(() => {
				return this.ensureConfiguration(user)
					.then((configuration) => {
						processData.configuration = configuration;
					})
			})
			.then(() => {
				return this.ensureBasicPeriods(user, processData)
					.then((basicPeriods) => {
						processData.basicPeriods = basicPeriods;
					})
			})
			.then(() => {
				return this.ensureAttributePeriods(user, processData)
					.then((attributePeriods) => {
						processData.attributePeriods = attributePeriods;
					})
			})
			.then(() => {
				return this.ensureAttributes(user, processData)
					.then((attributes) => {
						processData.attributes = attributes;
					})
			})
			.then(() => {
				return this.ensureAreaTrees(user, processData)
					.then((areaTrees) => {
						processData.areaTrees = areaTrees;
					})
			})
			.then(() => {
				return this.ensureAreaTreeLevels(user, processData)
					.then((areaTreeLevelss) => {
						processData.ensureAreaTreeLevels = areaTreeLevelss;
					})
			})
			.then(() => {
				return this.importLayersIntoPostgres(user, processData, unzippedFileSystem)
			})
			.then(() => {
				return this.ensureSpatialDataSources(user, unzippedFileSystem)
					.then((spatialDataSources) => {
						processData.spatialDataSources = spatialDataSources;
					})
			})
			.then(() => {
				return this.ensureAttributeDataSources(user, processData)
					.then((attributeDataSources) => {
						processData.attributeDataSources = attributeDataSources;
					})
			})
			.then(() => {
				console.log(`#### SZDC DATA IMPORT: DONE!`)
			})
			.catch((error) => {
				console.log(error);
			})
	}

	async ensureAttributeDataSources(user, processData) {
		let tableNames = _.map(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
			return layerName;
		});

		let existingAttributeDataSources = await this._pgDataSourcesCrud.get(
			`attribute`,
			{
				filter: {
					tableName: {
						in: tableNames
					}
				}
			},
			user
		).then((getResult) => {
			return getResult.data.attribute;
		});

		let attributeDataSourcesToCreateOrUpdate = [];
		_.each(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
			_.each(columns, (column) => {
				_.each(ATTRIBUTE_DEFINITIONS, (definition, attribute) => {
					if((!definition.regex && column === attribute) || (definition.regex && column.match(definition.regex))) {
						let existingPreparedAttributeDataSource = _.find(attributeDataSourcesToCreateOrUpdate, (existingPreparedAttributeDataSource) => {
							return existingPreparedAttributeDataSource.data.tableName === layerName && existingPreparedAttributeDataSource.data.columnName === attribute;
						});

						if(!existingPreparedAttributeDataSource) {
							let existingAttributeDataSource = _.find(existingAttributeDataSources, (existingAttributeDataSource) => {
								return existingAttributeDataSource.data.tableName === layerName && existingAttributeDataSource.data.columnName === attribute;
							});

							let key = existingAttributeDataSource ? existingAttributeDataSource.key : uuidv4();
							attributeDataSourcesToCreateOrUpdate.push(
								{
									key,
									data: {
										tableName: layerName,
										columnName: attribute
									}
								}
							)
						}
					}
				})
			})
		});

		return this._pgDataSourcesCrud.update(
			{
				attribute: attributeDataSourcesToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.attribute;
		});
	}

	async ensureSpatialDataSources(user, unzippedFileSystem) {
		let spatialFileNames = _.map(unzippedFileSystem.contents(), (unzippedFile) => {
			return unzippedFile.replace(`.geojson`, ``);
		});

		let existingSpatialDataSources = await this._pgDataSourcesCrud.get(
			`spatial`,
			{
				filter: {
					type: `vector`,
					tableName: {
						in: spatialFileNames
					}
				}
			},
			user
		).then((getResult) => {
			return getResult.data.spatial;
		});


		let spatialDataSourceToCreateOrUpdate = [];
		_.each(spatialFileNames, (spatialFileName) => {
			let existingSpatialDataSource = _.find(existingSpatialDataSources, (existingSpatialDataSource) => {
				return existingSpatialDataSource.data.tableName === spatialFileName;
			});

			let key = existingSpatialDataSource ? existingSpatialDataSource.key : uuidv4();

			spatialDataSourceToCreateOrUpdate.push(
				{
					key,
					data: {
						tableName: spatialFileName,
						type: `vector`
					}
				}
			)
		});

		return this._pgDataSourcesCrud.update(
			{
				spatial: spatialDataSourceToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.spatial;
		})
	}

	async importLayersIntoPostgres(user, processData, unzippedFileSystem) {
		for(let zippedFile of unzippedFileSystem.contents()) {
			let layerName = zippedFile.replace(`.geojson`, ``);

			let temporaryPath = `/tmp/${zippedFile}`;

			fse.writeJsonSync(temporaryPath, JSON.parse(unzippedFileSystem.read(zippedFile, `buffer`)));
			child_process.execSync(`ogr2ogr -f "PostgreSQL" PG:"host=localhost dbname=geonode_data user=geonode password=geonode" -lco LAUNDER=NO -lco GEOMETRY_NAME=the_geom -nln "${layerName}" -overwrite "${temporaryPath}"`);

			if(temporaryPath) {
				fse.removeSync(temporaryPath);
			}
		}
	}

	async ensureAreaTreeLevels(user, processData) {
		let existingAreaTreeLevels = await this._pgMetadataCrud.get(
			`areaTreeLevels`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResults) => {
			return getResults.data.areaTreeLevels;
		});

		let areaTreeLevelsToCreateOrUpdate = [];

		Object.keys(processData.analyzeResults.columnsPerLayer).forEach((layerName) => {
			let existingAreaTreeLevel = _.find(existingAreaTreeLevels, (existingAreaTreeLevel) => {
				return existingAreaTreeLevel.data.nameInternal === layerName;
			});

			let existingAreaTree = _.find(processData.areaTrees, (existinAreaTree) => {
				return existinAreaTree.data.nameInternal === layerName;
			});

			let key = existingAreaTreeLevel ? existingAreaTreeLevel.key : uuidv4();

			areaTreeLevelsToCreateOrUpdate.push(
				{
					key,
					data: {
						nameInternal: layerName,
						applicationKey: APPLICATION_KEY,
						areaTreeKey: existingAreaTree.key,
						level: 1
					}
				}
			);
		});

		return this._pgMetadataCrud.update(
			{
				areaTreeLevels: areaTreeLevelsToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.areaTreeLevels;
		})
	}

	async ensureAreaTrees(user, processData) {
		let existingAreaTrees = await this._pgMetadataCrud.get(
			`areaTrees`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResults) => {
			return getResults.data.areaTrees;
		});

		let areaTreesToCreateOrUpdate = [];

		Object.keys(processData.analyzeResults.columnsPerLayer).forEach((layerName) => {
			let existingAreaTree = _.find(existingAreaTrees, (existingAreaTree) => {
				return existingAreaTree.data.nameInternal === layerName;
			});

			let key = existingAreaTree ? existingAreaTree.key : uuidv4();

			areaTreesToCreateOrUpdate.push(
				{
					key,
					data: {
						nameInternal: layerName,
						applicationKey: APPLICATION_KEY
					}
				}
			);
		});

		return this._pgMetadataCrud.update(
			{
				areaTrees: areaTreesToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.areaTrees;
		})
	}

	async analyzeInputData(unzippedFileSystem) {
		let analyzeResults = {};

		let availableDates = [];
		let columns = {};

		_.each(unzippedFileSystem.contents(), (zippedFile) => {
			if (zippedFile.endsWith(`.geojson`)) {
				let geojson;
				try {
					geojson = JSON.parse(unzippedFileSystem.read(zippedFile, `buffer`));
				} catch (e) {
					throw new Error(`Unable to parse ${zippedFile}`);
				}

				// let trackIdent = zippedFile.split(`_`)[1];
				// if(!trackIdent.match(/t[0-9]*/)) {
				// 	throw new Error(`no track file`);
				// }

				let layerName = zippedFile.replace(`.geojson`, ``);

				columns[layerName] = [];

				_.each(Object.keys(geojson.features[0].properties), (columnName) => {
					columns[layerName].push(columnName);

					if (columnName.match(/[s|m|d]_[0-9]{8}/)) {
						availableDates.push(columnName.split(`_`)[1]);
					}
				});
			}
		});

		availableDates.sort();

		analyzeResults.minDate = availableDates.shift();
		analyzeResults.maxDate = availableDates.pop();
		analyzeResults.attributePeriods = _.uniq(availableDates);
		analyzeResults.columnsPerLayer = columns;

		return analyzeResults
	}

	async ensureBasicPeriods(user, processData) {
		let existingPeriods = await this._pgMetadataCrud.get(
			`periods`,
			{
				filter: {
					nameDisplay: {
						in: _.map(BASIC_PERIOD_DAYS, (days) => {
							return `${days} days`
						})
					},
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResults) => {
			return getResults.data.periods;
		});

		let periodsToCreateOrUpdate = [];
		_.each(BASIC_PERIOD_DAYS, (days) => {
			let existingPeriod = _.find(existingPeriods, (existingPeriod) => {
				return existingPeriod.data.nameDisplay === `${days} days`;
			});
			let key = existingPeriod ? existingPeriod.key : uuidv4();

			let endDate = this.getDateFromNonStandardString(processData.analyzeResults.maxDate);
			let startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

			let endDateString = endDate.toISOString();
			let startDateString = startDate.toISOString();

			periodsToCreateOrUpdate.push(
				{
					key,
					data: {
						nameDisplay: `${days} days`,
						period: `${startDateString}/${endDateString}`,
						start: startDateString,
						end: endDateString,
						applicationKey: APPLICATION_KEY
					}
				}
			)
		});

		return this._pgMetadataCrud.update(
			{
				periods: periodsToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.periods;
		})
	}

	async ensureAttributePeriods(user, processData) {
		let existingPeriods = await this._pgMetadataCrud.get(
			`periods`,
			{
				filter: {
					nameDisplay: {
						in: processData.analyzeResults.attributePeriods
					},
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResults) => {
			return getResults.data.periods;
		});

		let periodsToCreateOrUpdate = [];

		_.each(processData.analyzeResults.attributePeriods, (attributePeriod) => {
			let periodDateIsoString = this.getDateFromNonStandardString(attributePeriod).toISOString();
			let existingPeriod = _.find(existingPeriods, (existingPeriod) => {
				return existingPeriod.data.nameDisplay === attributePeriod;
			});

			let key = existingPeriod ? existingPeriod.key : uuidv4();

			periodsToCreateOrUpdate.push(
				{
					key,
					data: {
						nameDisplay: attributePeriod,
						applicationKey: APPLICATION_KEY,
						period: periodDateIsoString,
						start: periodDateIsoString,
						end: periodDateIsoString
					}
				}
			)
		});

		return this._pgMetadataCrud.update(
			{
				periods: periodsToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.periods;
		})
	}

	async ensureAttributes(user, processData) {
		let existingAttributes = await this._pgMetadataCrud.get(
			`attributes`,
			{
				filter: {
					nameInternal: {
						in: Object.keys(ATTRIBUTE_DEFINITIONS)
					},
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResults) => {
			return getResults.data.attributes;
		});

		let attributesToCreateOrUpdate = [];
		_.each(ATTRIBUTE_DEFINITIONS, (attributeDefinition, attributeNameInternal) => {
			let existingAttribute = _.find(existingAttributes, (existingAttribute) => {
				return existingAttribute.data.nameInternal === attributeNameInternal;
			});

			let key = existingAttribute ? existingAttribute.key : uuidv4();

			attributesToCreateOrUpdate.push(
				{
					key,
					data: {
						nameInternal: attributeNameInternal,
						nameDisplay: attributeDefinition.name || null,
						description: attributeDefinition.description || null,
						type: attributeDefinition.type || null,
						unit: attributeDefinition.unit || null,
						valueType: attributeDefinition.valueType || null,
						color: attributeDefinition.color || null,
						applicationKey: APPLICATION_KEY
					}
				}
			)
		});

		return this._pgMetadataCrud.update(
			{
				attributes: attributesToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.attributes;
		})
	}

	ensureApplication(user) {
		return this._pgApplicationsCrud.update(
			{
				applications: [
					{
						key: APPLICATION_KEY,
						data: {
							name: `Insar SZDC`
						}
					}
				]
			},
			user,
			{}
		).then((data) => {
			return data.applications[0];
		})
	}

	async ensureConfiguration(user) {
		let existingConfiguration = await this._pgApplicationsCrud.get(
			`configurations`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResults) => {
			return getResults.data.configurations[0];
		});

		let key = existingConfiguration ? existingConfiguration.key : uuidv4();

		return this._pgApplicationsCrud.update(
			{
				configurations: [
					{
						key,
						data: {
							applicationKey: APPLICATION_KEY
						}
					}
				]
			},
			user,
			{}
		).then((data) => {
			return data.configurations[0];
		})
	}

	getDateFromNonStandardString(string) {
		let year = string.substring(0, 4);
		let month = string.substring(4, 6);
		let day = string.substring(6);

		return new Date(`${year}-${month}-${day}`);
	}
}

module.exports = InsarSzdcImporter;