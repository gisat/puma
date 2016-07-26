module.exports = {
	localHost       : "localhost",
	localPort       : 4000,
	localPath       : "/",

	remoteProtocol  : "http",
	remoteAddress   : "localhost:4000",
	projectHome     : "",

	pgDataConnString   : "postgres://geonode:geonode@localhost:5432/geonode_data",
	pgGeonodeConnString: "postgres://geonode:geonode@localhost:5432/geonode",
	mongoConnString    : "mongodb://localhost:27017/panther",

	workspaceSchemaMap: {
		geonode: "public"
	},

	geoserverHost   : "localhost",
	geoserverPort   : 80,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",

	geoserver2Host  : "localhost",
	geoserver2Port  : 80,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeProtocol : "http",
	geonodeHost     : "localhost",
	geonodePort			: 80,
	geonodePath     : "/geonode",
	geonodeHome     : "/geonode/",

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

	toggles: {
		noGeoserverLayerGroups: false,
		useWBAgreement: false,
		useWBHeader: false,
		useWBFooter: false,
		allowPumaHelp: false,
		allowDownloadsLink: false,
		usePumaLogo: false,
		advancedFiltersFirst: false
		//renameAdvancedFiltersTo: "Evaluation Tool"
	},

	allowedOrigins: "http://localhost:5555",
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
	temporaryDownloadedFilesLocation: 'C:\\Users\\jbalhar\\',

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
	environment: 'production'
};
