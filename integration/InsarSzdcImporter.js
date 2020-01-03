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

const InsarSzdcImporterStyles = require(`./InsarSzdcImporterStyles`);

const APPLICATION_KEY = "szdcInsar19";
const BASIC_PERIOD_DAYS = [90, 180, 365, 1400];

const ATTRIBUTE_ALIASES = {
	totalDisplacement: `td`,
	dynamicTrend: `cl_dyn`,
	progress: `cl_prg`,
	averageVelocity: `vel_avg`,
	classification: `class`,
	verticalMovement: `td_vt_fn`,
	combinedMovement: {
		vertical: `td_u2`,
		eastWest: `td_e2`
	}
};

const CUSTOM_LAYER_DEFINITIONS = [
	{
		layerKey: "ortophoto",
		layerTemplateNameDisplay: "ČÚZK Ortofoto",
		type: "wms",
		url: "http://geoportal.cuzk.cz/WMS_ORTOFOTO_PUB/WMService.aspx",
		layers: "GR_ORTFOTORGB"
	},
	{
		layerKey: "dem",
		layerTemplateNameDisplay: "DEM",
		opacity: 0.5,
		type: "wms",
		url: "http://192.168.2.206:8965/remote-geoserver-1/insar/wms",
		layers: "insar:szdc_dmr5g_hillshaded"
	},
	{
		layerKey: "pasportPrazce",
		layerTemplateNameDisplay: "Pasport - pražce (rok)",
		type: "wms",
		url: "http://192.168.2.206:8965/remote-geoserver-1/insar/wms",
		layers: "insar:trat140_pasport"
	},
	{
		layerKey: "milestones",
		layerTemplateNameDisplay: "Staničení",
		type: "wms",
		url: "http://192.168.2.206:8965/remote-geoserver-1/insar/wms",
		layers: "insar:0112_stanicniky_wgs84"
	}
];

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
		t168: `triangle`
	},
	areaTreesAndLevels: {},
	customLayers: [],
	track: {
		attributesToShow: ["td", "risk", "std", "rel", "coh", "vel_avg", "vel_acc", "cl_prg", "cl_dyn", "cl_noise"],
		areaTrees: [],
		views: {
			totalDisplacement: {
				attributes: ["td", "std", "risk", "rel"],
				style: {}
			},
			dynamicTrend: {
				attributes: ["cl_dyn"],
				style: {},
				period: 1400
			},
			progress: {
				attributes: ["cl_prg"],
				style: {},
				period: 1400
			},
			averageVelocity: {
				attributes: ["vel_avg", "vel_acc"],
				style: {},
				period: 1400
			}
		},
		dAttribute: null,
		mAttribute: null,
		sAttribute: null,
	},
	zoneClassification: {
		attributesToShow: ["point_no", "track_no", "class", "td_vt_fn", "std_vt_fn", "risk_td", "rel_td", "td_u2", "td_e2", "std_u2", "std_e2"],
		areaTree: "",
		views: {
			classification: {
				attributes: ["class"],
				style: {},
				attributesToShow: {
					basePeriod: ["point_no", "track_no"],
					selectedPeriod: ["class", "td_vt_fn", "std_vt_fn", "risk_td", "rel_td"],
				}
			},
			verticalMovement: {
				attributes: ["td_vt_fn"],
				style: {},
				attributesToShow: {
					basePeriod: ["point_no", "track_no"],
					selectedPeriod: ["class", "td_vt_fn", "std_vt_fn", "risk_td", "rel_td"],
				}
			},
			combinedMovement: {
				attributes: ["td_u2", "td_e2"],
				style: {},
				attributesToShow: {
					basePeriod: ["point_no", "track_no"],
					selectedPeriod: ["class", "td_vt_fn", "std_vt_fn", "risk_td", "rel_td", "td_u2", "td_e2", "std_u2", "std_e2"],
				}
			}
		},
		tracks: {
			t44: {
				areaTree: null,
				idAttribute: "id_t44"
			},
			t95: {
				areaTree: null,
				idAttribute: "id_t95"
			},
			t168: {
				areaTree: null,
				idAttribute: "id_t168"
			}
		}
	}
};

const FID_COLUMN = "id";

const ATTRIBUTE_DEFINITIONS = {
	id: {
		description: "Unikátní identifikátor bodu detekovaného PSI",
		name: "ID"
	},
	vel_avg: {
		description: "Průměrná rychlost v LOS",
		name: "Průměrná rychlost",
		unit: "mm/r"
	},
	vel_sd: {
		description: "směrodatná odchylka rychlosti, nereálná hodnota",
		unit: "mm/r"
	},
	vel_acc: {
		description: "Směrodatná odchylka rychlosti v LOS",
		name: "Směrodatná odchylka rychlosti",
		unit: "mm/r"
	},
	s0: {
		description: "směrodatná odchylka polohy (jednoho měření)",
		unit: "mm"
	},
	vel_cum: {
		description: "celkový pohyb za celou dobu sledování, obecně za jinou dobu pro každý track",
		unit: "mm"
	},
	coh: {
		description: "koherence, 1 pro velmi kvalitní body, 0 pro body nekvalitní; body s koherencí < 0.4 byly vyloučeny",
		name: "Koherence"
	},
	cl_prg: {
		description: "Trend pohybu detekovaného bodu za celou dobu sledování",
		name: "Trend pohybu"
	},
	cl_dyn: {
		description: "Dynamika trendu pohybu pro daný bod",
		name: "Dynamika trendu pohybu"
	},
	cl_jmp: {
		description: "jedno- či dvouciferné číslo reprezentující jednorázové změny polohy. Jednotky udávají počet jednorázových změn (skoků) nahoru, desítky počet skoků směrem dolů. (nejde + a -?)"
	},
	cl_noise: {
		description: "Změny úrovní šumu",
		name: "Změny úrovní šumu"
	},
	cl_ue: {
		description: "Číslo reprezentující pravděpodobnost chyby z rozbalení fáze pro časový průběh daného bodu (na základě pouze časové informace), vždy >=0, vždy <=1"
	},
	corr_ue: {
		description: "Počet opravených chyb z rozbalení fáze v daném průběhu"
	},
	vel_last: {
		description: "Rychlost v posledním klasifikovaném úseku",
		unit: "mm/r"
	},
	svel_last: {
		description: "Sm. odchylka rychlosti (reálná hodnota) v posledním klasifikovaném úseku",
		unit: "mm/r"
	},
	td_last: {
		description: "Celkový posun (total displacement) v posledním klasifikovaném úseku (pozn. tento klasifikovaný úsek je pro každý bod obecně jinak dlouhý!)",
		unit: "mm"
	},
	std_last: {
		description: "Sm. odchylka celkového pohybu v posledním klasifikovaném úseku",
		unit: "mm"
	},
	cl_tempc: {
		description: "korelační koeficient mezi časovým průběhem a přibližnými teplotami, udává možnost dilatace daného bodu vlivem teploty: VERY WEAK/WEAK/MODERATE/STRONG/VERY STRONG"
	},
	dil_c: {
		description: "odhad dilatačního koeficientu pro body s CL_TEMPC jiné než VERY WEAK",
		unit: "mm/degC"
	},
	td: {
		description: "Celkový posun v LOS za vybraný časový úsek (daný počtem dnů vybraného úseku před posledním měřením v časové řadě)",
		name: "Posun v LOS za vybraný časový úsek",
		regex: /^td_([0-9]+)/,
		basePeriod: true,
		unit: "mm"
	},
	std: {
		description: "Směrodatná odchylka posunu v LOS za vybraný časový úsek (daný počtem dnů vybraného úseku před posledním měřením v časové řadě)",
		name: "Směrodatná odchylka posunu v LOS  za vybraný časový úsek",
		regex: /^std_([0-9]+)/,
		basePeriod: true,
		unit: "mm"
	},
	d: {
		name: "Posun",
		description: "hodnota polohy daného bodu pro dané datum",
		regex: /^d_([0-9]{8})/,
		unit: "mm"
	},
	m: {
		name: "Posun",
		description: "modelová poloha daného bodu pro dané datum",
		regex: /^m_([0-9]{8})/,
		unit: "mm"
	},
	s: {
		name: "Posun",
		description: "vyhlazená hodnota polohy daného bodu pro dané datum",
		regex: /^s_([0-9]{8})/,
		unit: "mm"
	},
	risk: {
		name: "Třída rizika posunu v LOS za vybraný časový úsek",
		description: "Třída rizika pohybu dle celkového posunu v LOS  za vybraný časový úsek (daný počtem dnů vybraného úseku před posledním měřením v časové řadě)",
		regex: /^risk_([0-9]+)/,
		basePeriod: true
	},
	rel: {
		name: "Třída spolehlivost v LOS za vybraný časový úsek",
		description: "Třída spolehlivosti pohybu směrodatné odchylky celkového posunu v LOS  za vybraný časový úsek (daný počtem dnů vybraného úseku před posledním měřením v časové řadě)",
		regex: /^rel_([0-9]+)/,
		basePeriod: true
	},
	point_no: {
		description: "Počet bodů pro dekompozici (indikativní míra spolehlivosti)",
		name: "Počet bodů pro dekompozici"
	},
	track_no: {
		name: "Počet tracků pro dekompozici",
		description: "Počet tracků pro dekompozici (indikativní míra spolehlivosti)"
	},
	class: {
		name: "Třída směru pohybu dle testování směrové dekompozice",
		description: "Určení třídy směru pohybu a míry jeho spolehlivosti statistickým testováním směrové dekompozice pro blízké body z více drah"
	},
	rel_class: {
		name: "Míra spolehlivosti",
		description: "Míra spolehlivosti určení typu pohybu"
	},
	var_vt_fn: {
		name: "Statisticky ověřený vertikální posun ve vybraném časovém úseku před posledním měřením",
		description: "Velikost vertikálního pohybu v buňce pro body, kde byl statistickým testováním ověřen vertikální směr posunu (hypotéza o vert. pohybu nebyla na dané hladině spolehlivosti zamítnuta)",
		alias: "td_vt_fn",
		unit: "mm"
	},
	svar_vt_fn: {
		name: "Směrodatná odchylka statisticky ověřeného vertikálního posunu ve vybraném časovém úseku před posledním měřením",
		description: "Směrodatná odchylka vertikálního pohybu v buňce pro body, kde byl statistickým testováním ověřen vertikální směr posunu (hypotéza o vert. pohybu nebyla na dané hladině spolehlivosti zamítnuta)",
		alias: "std_vt_fn"
	},
	var_u2: {
		name: "Vertikální komponenta posunu po ověření ve vybraném časovém úseku před posledním měřením)",
		description: "Velikost vertikální komponenta posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "td_u2",
		unit: "mm"
	},
	var_e2: {
		name: "Horizontální komponenta posunu po ověření ve vybraném časovém úseku před posledním měřením",
		description: "Velikost východo-západní horizontální komponenty posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "td_e2",
		unit: "mm"
	},
	svar_u2: {
		name: "Směrodatná odchylka vertikální komponenty posunu po ověření ve vybraném časovém úseku před posledním měřením",
		description: "Směrodatná odchylka velikosti vertikální komponenty posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "std_u2",
		unit: "mm"
	},
	svar_e2: {
		name: "Směrodatná odchylka horizontální komponenty posun po ověření ve vybraném časovém úseku před posledním měřením",
		description: "Směrodatná odchylka velikosti východo-západní horizontální komponenty posunu pro body, kde byl statistickým testováním ověřen významný posun v horizontálním směru po směrové dekompozici vektoru z LOS",
		alias: "std_e2",
		unit: "mm"
	},
	risk_var: {
		name: "Třída rizika statisticky ověřeného vertikálního posunu  ve vybraném časovém úseku před posledním měřením",
		description: "Třída rizika vertikálního pohybu pohybu v buňce dle vertikálního posunu  za vybraný časový úsek (daný počtem dnů vybraného úseku před posledním měřením v časové řadě)",
		alias: "risk_td"
	},
	rel_var: {
		name: "Třída spolehlivosti statisticky ověřeného vertikálního posunu  ve vybraném časovém úseku před posledním měřením",
		description: "Třída spolehlivosti vertikálního pohybu dle směrodatné odchylky vertikálního posunu za vybraný časový úsek (daný počtem dnů vybraného úseku před posledním měřením v časové řadě)",
		alias: "rel_td"
	},
	id_t44: {
		name: "ID",
		description: "IDs of points from the source SHPs used for the decomposition"
	},
	id_t95: {
		name: "ID",
		description: "IDs of points from the source SHPs used for the decomposition"
	},
	id_t168: {
		name: "ID",
		description: "IDs of points from the source SHPs used for the decomposition"
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
				return this.ensureCustomLayers(user, processData)
					.then((customLayers) => {
						processData.customLayers = customLayers;
					})
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

	async ensureCustomLayers(user, procesData) {
		let existingLayerTemplates = await this._pgMetadataCrud.get(
			`layerTemplates`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				},
				limit: 9999999
			},
			user
		).then((getResults) => {
			return getResults.data.layerTemplates;
		});

		let existingSpatialDataSources = await this._pgDataSourcesCrud.get(
			`spatial`,
			{
				limit: 9999999
			},
			user
		).then((getResult) => {
			return getResult.data.spatial;
		});

		let existingSpatialRelations = await this._pgRelationsCrud.get(
			`spatal`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				},
				limit: 9999999
			},
			user
		).then((getResult) => {
			return getResult.data.spatial;
		});

		let customLayers = [];
		for (let customLayerDefinition of CUSTOM_LAYER_DEFINITIONS) {
			let existingLayerTemplate = _.find(existingLayerTemplates, (existingLayerTemplate) => {
				return existingLayerTemplate.data.nameDisplay === customLayerDefinition.layerTemplateNameDisplay;
			});

			let existingSpatialDataSource = _.find(existingSpatialDataSources, (existingSpatialDataSource) => {
				return existingSpatialDataSource.data.type === customLayerDefinition.type
					&& existingSpatialDataSource.data.url === customLayerDefinition.url
					&& existingSpatialDataSource.data.layers === customLayerDefinition.layers;
			});

			let layerTemplate = {
				key: existingLayerTemplate ? existingLayerTemplate.key : uuidv4(),
				data: {
					nameDisplay: customLayerDefinition.layerTemplateNameDisplay,
					applicationKey: APPLICATION_KEY
				}
			};

			layerTemplate = await this._pgMetadataCrud.update(
				{
					layerTemplates: [layerTemplate]
				},
				user,
				{}
			).then((data) => {
				return data.layerTemplates[0];
			});

			let spatialDataSource = {
				key: existingSpatialDataSource ? existingSpatialDataSource.key : uuidv4(),
				data: {
					type: customLayerDefinition.type,
					url: customLayerDefinition.url,
					layers: customLayerDefinition.layers
				}
			};

			spatialDataSource = await this._pgDataSourcesCrud.update(
				{
					spatial: [spatialDataSource]
				},
				user,
				{}
			).then((data) => {
				return data.spatial[0];
			});

			let existingSpatialRelation = _.find(existingSpatialRelations, (existingSpatialRelation) => {
				return existingSpatialRelation.data.spatialDataSourceKey === spatialDataSource.key
					&& existingSpatialRelation.data.layerTemplateKey === layerTemplate.key;
			});

			let spatialRelation = {
				key: existingSpatialRelation ? existingSpatialRelation.key : uuidv4(),
				data: {
					spatialDataSourceKey: spatialDataSource.key,
					layerTemplateKey: layerTemplate.key,
					applicationKey: APPLICATION_KEY
				}
			};

			await this._pgRelationsCrud.update(
				{
					spatial: [spatialRelation]
				},
				user,
				{}
			);

			let customLayer = {
				key: customLayerDefinition.layerKey,
				data: {
					layerTemplateKey: layerTemplate.key
				}
			};

			if (customLayerDefinition.opacity) {
				customLayer.data.opacity = customLayerDefinition.opacity;
			}

			customLayers.push(customLayer);
		}

		return customLayers;
	}

	async ensureStyles(user, processData) {
		_.each(InsarSzdcImporterStyles, (styleDefinition) => {
			_.each(styleDefinition.data.definition.rules, (rule) => {
				_.each(rule.styles, (style) => {
					if (style.hasOwnProperty(`attributeKey`)) {
						let existingAttribute = _.find(processData.attributes, (attribute) => {
							return attribute.data.nameInternal === style.attributeKey;
						});

						if (existingAttribute) {
							style.attributeKey = existingAttribute.key;
						}
					}
				});
			});
		});

		return this._pgMetadataCrud.update(
			{
				styles: InsarSzdcImporterStyles
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
			let property;
			if (areaTreeLevel.data.nameInternal.startsWith(`Track`)) {
				property = `track`;
			} else if (areaTreeLevel.data.nameInternal.startsWith(`Zone`)) {
				property = `zoneClassification`;
			}

			_.each(Object.keys(configurationData[property].views), (attributeName) => {
				let style = _.find(processData.styles, (style) => {
					return style.data.nameInternal === `${areaTreeLevel.data.nameInternal} - ${attributeName}`;
				});

				if (style) {
					configurationData[property].views[attributeName].style[areaTreeLevel.key] = style.key;
				}
			});
		});

		_.each(processData.areaTrees, (areaTree) => {
			if (areaTree.data.nameInternal.startsWith(`Track`)) {
				configurationData.track.areaTrees.push(areaTree.key);
			} else if (areaTree.data.nameInternal === `Zone classification`) {
				configurationData.zoneClassification.areaTree = areaTree.key;
			}
		});

		_.each(configurationData.track.views, (definition, viewName) => {
			let attributes = [];

			_.each(definition.attributes, (attributeNameInternal) => {
				let existingAttribute = _.find(processData.attributes, (attribute) => {
					return attribute.data.nameInternal === attributeNameInternal;
				});

				if (existingAttribute) {
					attributes.push(existingAttribute.key);
				}
			});

			definition.attributes = attributes;
		});

		_.each(configurationData.zoneClassification.views, (definition, viewName) => {
			if (_.isArray(definition.attributes)) {
				let attributes = [];

				_.each(definition.attributes, (attributeNameInternal) => {
					let existingAttribute = _.find(processData.attributes, (attribute) => {
						return attribute.data.nameInternal === attributeNameInternal;
					});

					if (existingAttribute) {
						attributes.push(existingAttribute.key);
					}
				});

				definition.attributes = attributes;
			} else if (_.isObject(definition.attributes)) {
				_.each(definition.attributes, (value, key) => {
					let existingAttribute = _.find(processData.attributes, (attribute) => {
						return attribute.data.nameInternal === value;
					});
					if (existingAttribute) {
						definition.attributes[key] = existingAttribute.key;
					}
				})
			}
		});

		_.each(processData.attributes, (attribute) => {
			if (attribute.data.nameInternal === "d") {
				configurationData.track.dAttribute = attribute.key;
			} else if (attribute.data.nameInternal === "m") {
				configurationData.track.mAttribute = attribute.key;
			} else if (attribute.data.nameInternal === "s") {
				configurationData.track.sAttribute = attribute.key;
			}
		});

		let caseTypes = ["track", "zoneClassification"];
		_.each(caseTypes, (caseType) => {
			let attributesToShowKeys = [];
			_.each(configurationData[caseType].attributesToShow, (attributeNameInternal) => {
				let attributeToShow = _.find(processData.attributes, (attribute) => {
					return attribute.data.nameInternal === attributeNameInternal;
				});

				if(attributeToShow) {
					attributesToShowKeys.push(attributeToShow.key);
				}
			});

			configurationData[caseType].attributesToShow = attributesToShowKeys;
		});

		_.each(processData.areaTreeLevels, (areaTreeLevel) => {
			configurationData.areaTreesAndLevels[areaTreeLevel.data.areaTreeKey] = areaTreeLevel.key;
		});

		configurationData.customLayers = processData.customLayers;

		_.each(configurationData.zoneClassification.tracks, (trackDefinition, key) => {
			_.each(processData.analyzeResults.columnsPerLayer, (columns, layerName) => {
				if(layerName.includes(key)) {
					let [nameDisplay, nameInternal, isClass, isTrack, classPeriod, trackNo] = this.getMetadataFromLayerName(layerName);

					let areaTree = _.find(processData.areaTrees, (areaTree) => {
						return areaTree.data.nameInternal === nameInternal;
					});

					let attribute = _.find(processData.attributes, (attribute) => {
						return attribute.data.nameInternal === trackDefinition.idAttribute;
					});

					trackDefinition.areaTree = areaTree.key;
					trackDefinition.idAttribute = attribute.key;
				};
			})
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
				},
				limit: 9999999
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

				let period, match;
				if (isTrack) {
					if (attributeDefinition.regex && !attributeDefinition.basePeriod) {
						match = attributeDataSource.data.columnName.match(attributeDefinition.regex);
						period = _.find(processData.attributePeriods, (attributePeriod) => {
							return attributePeriod.data.nameInternal === match[1];
						})
					} else if (attributeDefinition.regex && attributeDefinition.basePeriod) {
						match = attributeDataSource.data.columnName.match(attributeDefinition.regex);
						if (!BASIC_PERIOD_DAYS.includes(Number(match[1]))) {
							period = _.find(processData.basicPeriods, (basicPeriod) => {
								return basicPeriod.data.nameInternal === String(BASIC_PERIOD_DAYS[BASIC_PERIOD_DAYS.length - 1]);
							});
						} else {
							period = _.find(processData.basicPeriods, (basicPeriod) => {
								return basicPeriod.data.nameInternal === match[1];
							})
						}
					} else {
						period = _.find(processData.basicPeriods, (basicPeriod) => {
							return basicPeriod.data.nameInternal === String(BASIC_PERIOD_DAYS[BASIC_PERIOD_DAYS.length - 1]);
						});
					}
				} else if (isClass) {
					if (BASIC_PERIOD_DAYS.includes(classPeriod)) {
						period = _.find(processData.basicPeriods, (basicPeriod) => {
							return basicPeriod.data.nameInternal === String(classPeriod);
						});
					} else {
						period = _.find(processData.basicPeriods, (basicPeriod) => {
							return basicPeriod.data.nameInternal === String(BASIC_PERIOD_DAYS[BASIC_PERIOD_DAYS.length - 1]);
						});
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
				},
				limit: 9999999
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
						fidColumnName: FID_COLUMN,
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
				limit: 9999999
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
				},
				limit: 9999999
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
				},
				limit: 9999999
			},
			user
		).then((getResults) => {
			return getResults.data.areaTreeLevels;
		});

		let areaTreeLevelsToCreateOrUpdate = [];

		Object.keys(processData.analyzeResults.columnsPerLayer).forEach((layerName) => {
			let [nameDisplay, nameInternal] = this.getMetadataFromLayerName(layerName);

			if (nameInternal) {
				let preparedAreaTreeLevel = _.find(areaTreeLevelsToCreateOrUpdate, (preparedAreaTreeLevel) => {
					return preparedAreaTreeLevel.data.nameInternal === nameInternal
						&& preparedAreaTreeLevel.data.applicationKey === APPLICATION_KEY;
				});

				if (!preparedAreaTreeLevel) {
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
				}
			}
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
			nameDisplay = `Zone classification`;
		} else if (trackMatch) {
			nameDisplay = `Track ${trackMatch[1]}`;
		}

		nameInternal = nameDisplay;

		return [nameDisplay, nameInternal, !!(classMatch), !!(trackMatch), Number(classMatch && classMatch[1]), Number(trackMatch && trackMatch[1])];
	}

	async ensureAreaTrees(user, processData) {
		let existingAreaTrees = await this._pgMetadataCrud.get(
			`areaTrees`,
			{
				filter: {
					applicationKey: APPLICATION_KEY
				},
				limit: 9999999
			},
			user
		).then((getResults) => {
			return getResults.data.areaTrees;
		});

		let areaTreesToCreateOrUpdate = [];
		Object.keys(processData.analyzeResults.columnsPerLayer).forEach((layerName) => {
			let [nameDisplay, nameInternal] = this.getMetadataFromLayerName(layerName);

			if (nameInternal) {
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
					nameInternal: {
						in: _.map(BASIC_PERIOD_DAYS, (days) => {
							return String(days);
						})
					},
					applicationKey: APPLICATION_KEY
				},
				limit: 9999999
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
					nameInternal: {
						in: processData.analyzeResults.attributePeriods
					},
					applicationKey: APPLICATION_KEY
				},
				limit: 9999999
			},
			user
		).then((getResults) => {
			return getResults.data.periods;
		});

		let periodsToCreateOrUpdate = [];

		_.each(processData.analyzeResults.attributePeriods, (attributePeriod) => {
			let periodDateIsoString = this.getDateFromNonStandardString(attributePeriod).toISOString();
			let existingPeriod = _.find(existingPeriods, (existingPeriod) => {
				return existingPeriod.data.nameInternal === attributePeriod;
			});

			let key = existingPeriod ? existingPeriod.key : uuidv4();

			periodsToCreateOrUpdate.push(
				{
					key,
					data: {
						nameDisplay: attributePeriod,
						nameInternal: attributePeriod,
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
					applicationKey: APPLICATION_KEY
				},
				limit: 9999999
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
				},
				limit: 9999999
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