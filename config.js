module.exports = {
	localHost       : "localhost",
	localPort       : 3000,
	localPath       : "/",

	remoteProtocol  : "http",
	remoteAddress   : "localhost",
	projectHome     : "http://localhost",

	pgDataConnString   : "postgres://geonode:geonode@localhost:5432/geonode_data",
	pgGeonodeConnString: "postgres://geonode:geonode@localhost:5432/geonode",
	mongoConnString    : "mongodb://localhost:27017/panther",

	/*
	 * Mapping of geoserver workspace to database schema.
	 *
	 * Currently, if other schema than default is needed
	 * there must be a new workspace for every such schema.
	 */
	workspaceSchemaMap: {
		geonode: "public"
	},

	/*
	 * The settings for remote databases.
	 *
	 * Remote database schemas must be brought to pgData database using foreign data wrapper.
	 * This is needed while panther builds its own view on top of feature table/layer
	 * and it is allowed by postgresql withinside one database only.
	 *
	 * FIXME:
	 * Such feature is unfinished, used partially and should be secured as soon as possible.
	 */
	remoteDbSchemas: {
		/*urbis: {
			connString: "postgres://geonode:geonode@127.0.0.1:5432/geonode_data",
			workspaceMap: [
				{workspace: "urbis_ancillary_layers",
				 remote_schema: "ancillary_layers",
				 local_schema: "ancillary_layers"},
				{workspace: "urbis_input",
				 remote_schema: "input",
				 local_schema: "input"},
				{workspace: "urbis_results_final",
				 remote_schema: "results_final",
				 local_schema: "results_final"}
			]
		}*/
	},
	geometryColumnNamePattern: "%geom%",

	geoserverHost   : "localhost",
	geoserverPort   : 8080,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",
	/*
	 * It contains workspace, which is used when storing and generating things in the geoserver.
	 */
	geoserverWorkspace: "puma",

	geoserver2Host  : "localhost",
	geoserver2Port  : 8181,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeProtocol : "http",
	geonodeHost     : "localhost",
	geonodePort	    : 80,
	geonodePath     : "/geonode",
	geonodeHome     : "/geonode",

	googleAnalyticsTracker: '',
	googleAnalyticsCookieDomain: 'auto',
	// see https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers

	/*
	 * Different options about what map should be shown as the first one.
     * osm - OpenStreetMap using Mapnik
     * hybrid - Google hybrid solution
     * roadmap - Google road map
     * terrain - Google terrain map
	 */
	initialBaseMap: "terrain",

	/*
	 * It is used to decide about the initial bounds for the map.
	 * [left, bottom, right, top]
	 */
	initialMapBounds: [
		112.4251556396,
		-7.7001045314,
		113.0046844482,
		-6.9809544265
	],

	debug: true,

	htmlTagClasses: "urbis",

	toggles: {
		noGeoserverLayerGroups: false,
		useWBAgreement: false,
		useWBHeader: false,
		useHeader: false,
		useWBFooter: false,
		useFooterLegal: false,
		allowPumaHelp: false,
		allowDownloadsLink: false,
		usePumaLogo: false,
		advancedFiltersFirst: true,
		isUrbis: false
	},

	texts: {
		advancedFiltersName: "Evaluation Tool",
		areasSectionName: "Selection level",
		appTitle: "URBIS tool",
		appName: "&nbsp;",
		scopeName: "Scale",
		scopeAbout: "Different type of data and information address different scales of analysis, which correspond to different levels of urban-related decision making. Please choose your scale of interest first.",
		placeName: "Pilot",
		placeAbout: "URBIS services are demonstrated thought implementation on three pilot sites, represented by city-regions distributed across Europe. The basic portfolio of URBIS services is prepared for all three pilots, advanced types of services must not be implemented for all pilots. You can start with analysis for single pilot of your interest or with benchmarking of all three pilots.",
		themeName: "Theme",
		themeAbout: "URBIS services are focused on different thematic information, including Green and Grey infrastructure or Urban Land Typology and Dynamics. Please select theme/service according your thematic interests."
	},

	allowedOrigins: "http://localhost:3000",
	/*
	 * It decides to which level will be the information logged. Default value is 1 meaning Info and higher will be logged
	 * 0 - TRACE
	 * 1 - INFO
	 * 2 - WARNING
	 * 3 - ERROR
	 * 4 - NOTHING
	 * Set level and all above will be logged.
	 */
	loggingLevel: 0,

	/*
	 * UrbanTEP - Destination of temporary downloaded files.
	 */
	temporaryDownloadedFilesLocation: '/var/tmp/panther',

	/*
	 * UrbanTEP - UserName and Password under which the layers are uploaded
	 */
	urbanTepGeonodeUserName: '',
	urbanTepGeonodeUserPassword: '',

	/*
	 * UrbanTep - Approximate pixel size in input tif file, m^2
	 */
	urbanTepTifPixelSize: 75*75,

	/*
	* Environment in which is the application run. The used libraries will differ.
	* Allowed values: 'production', 'development'
	* If no value is present production will be used
	*/
	environment: 'production',

	/*
	In this Schema all additional data ni PostgreSQL, such as Symbologies will be stored.
	 */
	postgreSqlSchema: 'data',

	/*
	Connection String split to pieces for the PostgreSQL.
	 */
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: 'localhost',
	pgDataPort: '5432',
};
