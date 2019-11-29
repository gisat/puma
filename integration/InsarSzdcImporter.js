const zipper = require(`zip-local`);
const uuidv4 = require(`uuid/v4`);
const _ = require(`lodash`);
const fse = require(`fs-extra`);
const child_process = require(`child_process`);

const config = require(`../config`);

const PgApplicationsCrud = require(`../application/PgApplicationsCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);
const PgRelationsCrud = require(`../relations/PgRelationsCrud`);

const APPLICATION_KEY = "szdcInsar19";
const BASIC_PERIOD_DAYS = [90, 180, 365, 1400];

const ATTRIBUTE_ALIASES = {
	totalDisplacement: `TD`,
	dynamicTrend: `CL_DYN`,
	progress: `CL_PRG`,
	averageVelocity: `VEL_AVG`,
	classification: `CLASS`,
	verticalMovement: `TD_VT_FN`,
	combinedMovement: {
		vertical: `TD_U2`,
		eastWest: `TD_E2`
	}
};

const BASE_TRACK_STYLE_DEFINITION = {
	rules:[
		{
			styles: [
				{
					shape: null,
					outlineWidth: 1,
					fill: null
				}
			]
		}
	]
};

const EXAMPLE_CONFIGURATION = {
	periods: {
		90: null,
		180: null,
		365: null,
		1400: null
	},
	basePeriod: null,
	trackColors: {
		t44: `#ff565b`,
		t95: `#00c400`,
		t168: `#3c86ff`
	},
	trackShape: {
		t44: `circle`,
		t95: `square`,
		t168: `triangel`
	},
	areaTreesAndLevels: {
	},
	track: {
		areaTrees: [],
		views: {
			totalDisplacement: {
				attribute: null,
				style: {}
			},
			dynamicTrend: {
				attribute: null,
				style: {}
			},
			progress: {
				attribute: null,
				style: {}
			},
			averageVelocity: {
				attribute: null,
				style: {}
			}
		},
		dAttribute: null,
		mAttribute: null,
		sAttribute: null,
	},
	zoneClassification: {
		areaTree: "",
		views: {
			classification: {
				attribute: null,
				style: null
			},
			verticalMovement: {
				attribute: null,
				style: null
			},
			combinedMovement: {
				attributes: {
					vertical: null,
					eastWest: null
				},
				style: null
			}
		}
	}
};

const FID_COLUMN = "ID";

const ATTRIBUTE_DEFINITIONS = {
	VEL_AVG: {
		description: "průměrná rychlost [mm/r]",
		name: "Průměrná rychlost [mm/r]"
	},
	VEL_SD: {
		description: "směrodatná odchylka rychlosti [mm/r], nereálná hodnota"
	},
	VEL_ACC: {
		description: "směrodatná odchylka rychlosti [mm/r], reálná hodnota, vyčíslená z rozptylu rychlosti pro body mimo trať (za předpokladu všeobecné stability)",
		name: "Směrodatná odchylka rychlosti [mm/r]"
	},
	S0: {
		description: "směrodatná odchylka polohy (jednoho měření) [mm]"
	},
	VEL_CUM: {
		description: "celkový pohyb [mm] za celou dobu sledování, obecně za jinou dobu pro každý track"
	},
	COH: {
		description: "koherence, 1 pro velmi kvalitní body, 0 pro body nekvalitní; body s koherencí < 0.4 byly vyloučeny",
		name: "Koherence"
	},
	CL_PRG: {
		description: "trend pohybu pro daný bod za celou dobu sledování: STABILITY/UPLIFT/SUBSIDENCE/OSCILLATION",
		name: "Trend pohybu"
	},
	CL_DYN: {
		description: "dynamický trend pohybu pro daný bod za celou dobu sledování: CONST_TREND/ACCELLERATION/DECCELLERATION/NO_CLASS",
		name: "Dynamika trendu pohybu"
	},
	CL_JMP: {
		description: "jedno- či dvouciferné číslo reprezentující jednorázové změny polohy. Jednotky udávají počet jednorázových změn (skoků) nahoru, desítky počet skoků směrem dolů. (nejde + a -?)"
	},
	CL_NOISE: {
		description: "jedno- či dvouciferné číslo reprezentující změny úrovní šumu. Jednotky udávají počet zvýšení hladiny šumu, desítky počet snížení hladiny šumu. (nejde + a -?)",
		name: "Změny úrovní šumu"
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
	TD: {
		description: "celkový posun v LOS [mm] za posledních X dnů sledování",
		name: "Posun v LOS (X dnů před Y)",
		regex: /TD_([0-9]+)/
	},
	STD: {
		description: "sm. odchylka [mm] celkového posunu za posledních X dnů sledování",
		name: "Směrodatná odchylka posunu v LOS (X dnů před Y)",
		regex: /STD_([0-9]+)/
	},
	d: {
		description: "hodnota polohy daného bodu [mm] pro dané datum",
		regex: /d_([0-9]{8})/
	},
	m: {
		description: "modelová poloha daného bodu [mm] pro dané datum",
		regex: /m_([0-9]{8})/
	},
	s: {
		description: "vyhlazená hodnota polohy daného bodu [mm] pro dané datum",
		regex: /s_([0-9]{8})/
	},
	RISK: {
		name: "Třída rizika posunu v LOS (X dnů před Y)",
		description: "Třída rizika pohybu dle celkového posunu v LOS za X dnů před Y",
		regex: /RISK_([0-9]+)/
	},
	REL: {
		name: "Třída spolehlivost v LOS (X dnů před Y)",
		description: "Třída spolehlivosti pohybu směrodatné odchylky celkového posunu v LOS za X dnů před Y",
		regex: /RISK_([0-9]+)/
	},
	POINT_NO: {
		description: "Počet bodů pro dekompozici (indikativní míra spolehlivosti)",
		name: "Počet bodů pro dekompozici"
	},
	TRACK_NO: {
		name: "Počet tracků pro dekompozici",
		description: "Počet tracků pro dekompozici (indikativní míra spolehlivosti)"
	},
	CLASS: {
		name: "Třída směru pohybu dle testování směrové dekompozice",
		description: "Určení třídy směru pohybu a míry jeho spolehlivosti statistickým testováním směrové dekompozice pro blízké body z více drah"
	},
	CLASS_REL: {
		name: "Míra spolehlivosti",
		description: "Míra spolehlivosti určení typu pohybu"
	},
	VAR_VT_FN: {
		name: "Vertikální posun|rychlost [mm | mm/rok] po ověření (X dnů před Y)",
		description: "Velikost vertikálního posunu pro body, kde byl statistickým testováním ověřen vertikální směr posunu",
		alias: "TD_VT_FN"
	},
	SVAR_VT_FN: {
		name: "Směrodatná odchylka vertikálního posunu po ověření (X dnů před Y)",
		description: "Směrodatná odchylka agregovaného vert. posunu pro body, kde byl statistickým testováním ověřen vertikální směr posunu",
		alias: "STD_VT_FN"
	},
	VAR_U2: {
		name: "Vertikální komponenta posunu|rychlosti [mm | mm/rok]] po ověření (X dnů před Y)",
		description: "Velikost vertikální komponenta posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "TD_U2"
	},
	VAR_E2: {
		name: "Horizontální komponenta posunu|rychlosti [mm | mm/rok]] po ověření (X dnů před Y)",
		description: "Velikost východo-západní horizontální komponenty posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "TD_E2"
	},
	SVAR_U2: {
		name: "Směrodatná odchylka vertikální komponenty posunu|rychlosti [mm | mm/rok]] po ověření (X dnů před Y)",
		description: "Směrodatná odchylka velikosti vertikální komponenty posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "STD_U2"
	},
	SVAR_E2: {
		name: "Směrodatná odchylka horizontální komponenty posunu|rychlosti [mm | mm/rok]] po ověření (X dnů před Y)",
		description: "Směrodatná odchylka velikosti východo-západní horizontální komponenty posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "STD_E2"
	},
	REL_CLASS: {
		name: "Míra spolehlivosti",
		description: "Míra spolehlivosti určení typu pohybu"
	},
	RISK_VAR: {
		name: "Třída rizika statisticky ověřeného vertikálního posunu(X dnů před Y)",
		description: "Třída rizika vertikálního pohybu pohybu v buňce dle vertikálního posunu za X dnů před Y",
		alias: "RISK_TD"
	},
	REL_VAR: {
		name: "Třída spolehlivosti statisticky ověřeného vertikálního posunu (X dnů před Y)",
		description: "Třída spolehlivosti vertikálního pohybu dle směrodatné odchylky vertikálního posunu za X dnů před Y",
		alias: "REL_TD"
	}
};

class InsarSzdcImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgApplicationsCrud = new PgApplicationsCrud(pgPool, config.pgSchema.application);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);
		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);
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
					.then((areaTreeLevels) => {
						processData.areaTreeLevels = areaTreeLevels;
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
				return this.ensureAreaRelations(user, processData)
					.then((areaRelations) => {
						processData.areaRelations = areaRelations;
					})
			})
			.then(() => {
				return this.ensureAttributeDataSourceRelations(user, processData)
					.then((attributeDataSourceRelations) => {
						processData.attributeDataSourceRelations = attributeDataSourceRelations;
					})
			})
			.then(() => {
				return this.ensureStyles(user, processData)
					.then((styles) => {
						processData.styles = styles;
					});
			})
			.then(() => {
				return this.updateConfiguration(user, processData);
			})
			.then(() => {
				status.state = `SUCCESSFULLY IMPORTED`;
				status.ended = new Date().toISOString();
				console.log(`#### SZDC DATA IMPORT: DONE!`)
			})
			.catch((error) => {
				status.state = `ERROR`;
				status.ended = new Date().toISOString();
				status.error = error.message;
				console.log(error);
			})
	}

	async ensureStyles(user, processData) {
		let existingStyles = await this._pgMetadataCrud.get(
			`styles`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResult) => {
			return getResult.data.styles;
		});

		let stylesToCreateOrUpdate = [];
		_.each(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
			let [nameDisplay, nameInternal, isClass, isTrack, period, trackNo] = this.getMetadataFromLayerName(layerName);

			if(isTrack) {
				_.each(Object.keys(EXAMPLE_CONFIGURATION.track.views), (attributeName) => {
					let trackStyleDefinition = _.cloneDeep(BASE_TRACK_STYLE_DEFINITION);
					let styleNameInternal = `${nameInternal} - ${attributeName}`;

					trackStyleDefinition.rules[0].styles[0].shape = EXAMPLE_CONFIGURATION.trackShape[`t${trackNo}`];
					trackStyleDefinition.rules[0].styles[0].fill = EXAMPLE_CONFIGURATION.trackColors[`t${trackNo}`];

					let existingStyle = _.find(existingStyles, (existingStyle) => {
						return existingStyle.data.nameInternal === styleNameInternal;
					});

					let key = existingStyle ? existingStyle.key : uuidv4();
					stylesToCreateOrUpdate.push(
						{
							key,
							data: {
								nameInternal: styleNameInternal,
								source: `definition`,
								definition: trackStyleDefinition,
								applicationKey: APPLICATION_KEY
							}
						}
					)
				});
			}
		});

		return this._pgMetadataCrud.update(
			{
				styles: stylesToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.styles;
		})
	}

	async updateConfiguration(user, processData) {
		let configurationData = _.cloneDeep(EXAMPLE_CONFIGURATION);

		_.each(processData.basicPeriods, (basicPeriod) => {
			configurationData.periods[basicPeriod.data.nameInternal] = basicPeriod.key;
			if (Number(basicPeriod.data.nameInternal) === BASIC_PERIOD_DAYS[BASIC_PERIOD_DAYS.length - 1]) {
				configurationData.basePeriod = basicPeriod.key;
			}
		});

		_.each(processData.areaTreeLevels, (areaTreeLevel) => {
			if (areaTreeLevel.data.nameInternal.startsWith(`Track`)) {
				_.each(Object.keys(configurationData.track.views), (attributeName) => {
					let style = _.find(processData.styles, (style) => {
						return style.data.nameInternal === `${areaTreeLevel.data.nameInternal} - ${attributeName}`;
					});

					if(style) {
						configurationData.track.views[attributeName].style[areaTreeLevel.key] = style.key;
					}
				});
			}
		});

		_.each(processData.areaTrees, (areaTree) => {
			if (areaTree.data.nameInternal.startsWith(`Track`)) {
				configurationData.track.areaTrees.push(areaTree.key);
			} else if (areaTree.data.nameInternal === `Zone classification`) {
				configurationData.zoneClassification.areaTree = areaTree.key;
			}
		});

		_.each(processData.attributes, (attribute) => {
			if (attribute.data.nameInternal === "d") {
				configurationData.track.dAttribute = attribute.key;
			} else if (attribute.data.nameInternal === "m") {
				configurationData.track.mAttribute = attribute.key;
			} else if (attribute.data.nameInternal === "s") {
				configurationData.track.sAttribute = attribute.key;
			} else if (attribute.data.nameInternal === ATTRIBUTE_ALIASES.totalDisplacement) {
				configurationData.track.views.totalDisplacement.attribute = attribute.key;
			} else if (attribute.data.nameInternal === ATTRIBUTE_ALIASES.dynamicTrend) {
				configurationData.track.views.dynamicTrend.attribute = attribute.key;
			} else if (attribute.data.nameInternal === ATTRIBUTE_ALIASES.progress) {
				configurationData.track.views.progress.attribute = attribute.key;
			} else if (attribute.data.nameInternal === ATTRIBUTE_ALIASES.averageVelocity) {
				configurationData.track.views.averageVelocity.attribute = attribute.key;
			}
		});

		_.each(processData.areaTreeLevels, (areaTreeLevel) => {
			configurationData.areaTreesAndLevels[areaTreeLevel.data.areaTreeKey] = areaTreeLevel.key;
		});

		processData.configuration.data.data = configurationData;
		return this._pgApplicationsCrud.update(
			{
				configurations: [processData.configuration]
			},
			user,
			{}
		)
	}

	async ensureAttributeDataSourceRelations(user, processData) {
		let existingAttributeDataSourceRelations = await this._pgRelationsCrud.get(
			`attribute`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResult) => {
			return getResult.data.attribute;
		});

		let attributeDataSourceRelationsToCreateOrUpdate = [];

		_.each(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
			let [nameDisplay, nameInternal, isClass, isTrack, classPeriod, trackNo] = this.getMetadataFromLayerName(layerName);

			let attributeDataSources = _.filter(processData.attributeDataSources, (attributeDataSource) => {
				return attributeDataSource.data.tableName === layerName;
			});

			let areaTreeLevel = _.find(processData.areaTreeLevels, (areaTreeLevel) => {
				return areaTreeLevel.data.nameInternal === nameInternal;
			});

			_.each(attributeDataSources, (attributeDataSource) => {
				let attributeDefinition, attributeNameInternal;

				_.each(ATTRIBUTE_DEFINITIONS, (definition, attribute) => {
					if (
						(!definition.regex && attributeDataSource.data.columnName === attribute)
						|| (definition.regex && attributeDataSource.data.columnName.match(definition.regex))
					) {
						if (definition.alias) {
							attributeNameInternal = definition.alias;
						} else {
							attributeNameInternal = attribute;
						}
						attributeDefinition = definition;
						return false;
					}
				});

				if (!attributeDefinition || !attributeNameInternal) {
					throw new Error(`ERR#03 - unable to create internal structures`)
				}

				let attribute = _.find(processData.attributes, (attribute) => {
					return attribute.data.nameInternal === attributeNameInternal;
				});

				let period;
				if (!attributeDefinition.period) {
					if (isTrack) {
						period = _.find(processData.basicPeriods, (basicPeriod) => {
							return basicPeriod.data.nameInternal === String(BASIC_PERIOD_DAYS[BASIC_PERIOD_DAYS.length - 1]);
						})
					} else if (isClass && BASIC_PERIOD_DAYS.includes(classPeriod)) {
						period = _.find(processData.basicPeriods, (basicPeriod) => {
							return basicPeriod.data.nameInternal === String(classPeriod);
						})
					}
				} else {
					let match = attributeDataSource.data.columnName.match(attributeDefinition.regexp);
					if (isTrack) {
						period = _.find(processData.attributePeriods, (attributePeriod) => {
							return attributePeriod.data.nameDisplay === match[1];
						})
					} else if (isClass && BASIC_PERIOD_DAYS.includes(classPeriod)) {
						period = _.find(processData.basicPeriods, (basicPeriod) => {
							return basicPeriod.data.nameInternal === match.groups.period;
						})
					}
				}

				if (!attributeDataSource || !areaTreeLevel || !attribute || !period) {
					throw new Error(`ERR#02 - unable to create internal structures`)
				}

				let existingAttributeDataSourceRelation = _.find(existingAttributeDataSourceRelations, (existingAttributeDataSourceRelation) => {
					return existingAttributeDataSourceRelation.data.attributeDataSourceKey === attributeDataSource.key
						&& existingAttributeDataSourceRelation.data.attributeKey === attribute.key
						&& existingAttributeDataSourceRelation.data.areaTreeLevelKey === areaTreeLevel.key
						&& existingAttributeDataSourceRelation.data.fidColumnName === FID_COLUMN
						&& existingAttributeDataSourceRelation.data.applicationKey === APPLICATION_KEY
						&& existingAttributeDataSourceRelation.data.periodKey === period.key
				});

				let key = existingAttributeDataSourceRelation ? existingAttributeDataSourceRelation.key : uuidv4();

				attributeDataSourceRelationsToCreateOrUpdate.push(
					{
						key,
						data: {
							attributeDataSourceKey: attributeDataSource.key,
							attributeKey: attribute.key,
							areaTreeLevelKey: areaTreeLevel.key,
							fidColumnName: FID_COLUMN,
							applicationKey: APPLICATION_KEY,
							periodKey: period.key
						}
					}
				)
			})
		});

		return this._pgRelationsCrud.update(
			{
				attribute: attributeDataSourceRelationsToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.attribute;
		})
	}

	async ensureAreaRelations(user, processData) {
		let existingAreaRelations = await this._pgRelationsCrud.get(
			`area`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				}
			},
			user
		).then((getResult) => {
			return getResult.data.area;
		});

		let areaRelationsToCreateOrUpdate = [];
		_.each(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
			let [nameDisplay, nameInternal] = this.getMetadataFromLayerName(layerName);

			let spatialDataSource = _.find(processData.spatialDataSources, (spatialDataSource) => {
				return spatialDataSource.data.tableName === layerName;
			});

			let areaTree = _.find(processData.areaTrees, (areaTree) => {
				return areaTree.data.nameInternal === nameInternal;
			});

			let areaTreeLevel = _.find(processData.areaTreeLevels, (areaTreeLevel) => {
				return areaTreeLevel.data.nameInternal === nameInternal;
			});

			if (!spatialDataSource || !areaTree || !areaTreeLevel) {
				throw new Error(`ERR#01 - unable to create internal structures`)
			}

			let existingAreaTreeRelation = _.find(existingAreaRelations, (existingAreaRelation) => {
				return existingAreaRelation.data.spatialDataSourceKey === spatialDataSource.key
					&& existingAreaRelation.data.areaTreeKey === areaTree.key
					&& existingAreaRelation.data.areaTreeLevelKey === areaTreeLevel.key
			});

			let key = existingAreaTreeRelation ? existingAreaTreeRelation.key : uuidv4();
			areaRelationsToCreateOrUpdate.push(
				{
					key,
					data: {
						areaTreeKey: areaTree.key,
						areaTreeLevelKey: areaTreeLevel.key,
						fidColumn: FID_COLUMN,
						spatialDataSourceKey: spatialDataSource.key,
						applicationKey: APPLICATION_KEY
					}
				}
			);
		});

		return this._pgRelationsCrud.update(
			{
				area: areaRelationsToCreateOrUpdate
			},
			user,
			{}
		).then((data) => {
			return data.area;
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
				},
				limit: 999999
			},
			user
		).then((getResult) => {
			return getResult.data.attribute;
		});


		let attributeDataSourcesToCreateOrUpdate = [];
		_.each(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
			_.each(columns, (column) => {
				_.each(ATTRIBUTE_DEFINITIONS, (definition, attribute) => {
					if (
						(!definition.regex && column === attribute)
						|| (definition.regex && column.match(definition.regex))
					) {
						let existingPreparedAttributeDataSource = _.find(attributeDataSourcesToCreateOrUpdate, (existingPreparedAttributeDataSource) => {
							return existingPreparedAttributeDataSource.data.tableName === layerName && existingPreparedAttributeDataSource.data.columnName === column;
						});

						if (!existingPreparedAttributeDataSource) {
							let existingAttributeDataSource = _.find(existingAttributeDataSources, (existingAttributeDataSource) => {
								return existingAttributeDataSource.data.tableName === layerName && existingAttributeDataSource.data.columnName === column;
							});

							let key = existingAttributeDataSource ? existingAttributeDataSource.key : uuidv4();
							attributeDataSourcesToCreateOrUpdate.push(
								{
									key,
									data: {
										tableName: layerName,
										columnName: column
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
		let layerNames = _.map(unzippedFileSystem.contents(), (unzippedFile) => {
			return unzippedFile.replace(`.geojson`, ``);
		});

		let existingSpatialDataSources = await this._pgDataSourcesCrud.get(
			`spatial`,
			{
				filter: {
					type: `vector`,
					tableName: {
						in: layerNames
					}
				}
			},
			user
		).then((getResult) => {
			return getResult.data.spatial;
		});


		let spatialDataSourceToCreateOrUpdate = [];
		_.each(layerNames, (spatialFileName) => {
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
		for (let zippedFile of unzippedFileSystem.contents()) {
			let layerName = zippedFile.replace(`.geojson`, ``);

			let temporaryPath = `/tmp/${zippedFile}`;

			fse.writeJsonSync(temporaryPath, JSON.parse(unzippedFileSystem.read(zippedFile, `buffer`)));
			child_process.execSync(`ogr2ogr -f "PostgreSQL" PG:"host=localhost dbname=geonode_data user=geonode password=geonode" -lco LAUNDER=NO -lco GEOMETRY_NAME=the_geom -nln "${layerName}" -overwrite "${temporaryPath}"`);

			if (temporaryPath) {
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
			let [nameDisplay, nameInternal] = this.getMetadataFromLayerName(layerName);

			let existingAreaTreeLevel = _.find(existingAreaTreeLevels, (existingAreaTreeLevel) => {
				return existingAreaTreeLevel.data.nameInternal === nameInternal;
			});

			let existingAreaTree = _.find(processData.areaTrees, (existinAreaTree) => {
				return existinAreaTree.data.nameInternal === nameInternal;
			});

			let key = existingAreaTreeLevel ? existingAreaTreeLevel.key : uuidv4();

			areaTreeLevelsToCreateOrUpdate.push(
				{
					key,
					data: {
						nameInternal: nameInternal,
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

	getMetadataFromLayerName(layerName) {
		let nameDisplay, nameInternal;

		let classMatch = layerName.match(/td([0-9]+)/);
		let trackMatch = layerName.match(/t([0-9]+)/);

		if (classMatch) {
			nameDisplay = `Zone classification - ${classMatch[1]} days`;
			nameInternal = `Zone classification`;
		} else if (trackMatch) {
			nameDisplay = `Track ${trackMatch[1]}`;
			nameInternal = nameDisplay;
		}

		return [nameDisplay, nameInternal, !!(classMatch), !!(trackMatch), Number(classMatch && classMatch[1]), Number(trackMatch && trackMatch[1])];
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
			let [nameDisplay, nameInternal] = this.getMetadataFromLayerName(layerName);

			if (nameDisplay) {
				let preparedAreaTree = _.find(areaTreesToCreateOrUpdate, (preparedAreaTree) => {
					return preparedAreaTree.data.nameInternal === nameInternal
						&& preparedAreaTree.data.applicationKey === APPLICATION_KEY;
				});

				if (!preparedAreaTree) {
					let existingAreaTree = _.find(existingAreaTrees, (existingAreaTree) => {
						return existingAreaTree.data.nameInternal === nameInternal;
					});

					let key = existingAreaTree ? existingAreaTree.key : uuidv4();

					areaTreesToCreateOrUpdate.push(
						{
							key,
							data: {
								nameDisplay,
								nameInternal,
								applicationKey: APPLICATION_KEY
							}
						}
					);
				}
			}
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
						nameInternal: days,
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

	prepareAttribute(attributesToCreateOrUpdate, existingAttributes, attributeNameInternal, attributeDefinition) {
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
			if (attributeDefinition.alias) {
				this.prepareAttribute(attributesToCreateOrUpdate, existingAttributes, attributeDefinition.alias, attributeDefinition);
			} else {
				this.prepareAttribute(attributesToCreateOrUpdate, existingAttributes, attributeNameInternal, attributeDefinition);
			}
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