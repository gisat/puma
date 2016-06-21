module.exports = {
	localHost       : "127.0.0.1",
	localPort       : 4000,
	localPath       : "/",

	remoteProtocol  : "http",
	remoteAddress   : "localhost:4000",
	projectHome     : "",

	pgDataConnString   : "postgres://geonode:geonode@185.8.164.70:5432/geonode_data",
	pgGeonodeConnString: "postgres://geonode:geonode@185.8.164.70:5432/geonode",
	mongoConnString    : "mongodb://185.8.164.70:27017/panther",

	workspaceSchemaMap: {
		geonode: "public"
	},

	geoserverHost   : "185.8.164.70",
	geoserverPort   : 80,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",

	geoserver2Host  : "185.8.164.70",
	geoserver2Port  : 80,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeProtocol : "http",
	geonodeHost     : "185.8.164.70",
	geonodePort			: 80,
	geonodePath     : "",
	geonodeHome     : "/",

	googleAnalyticsTracker: '',
	googleAnalyticsCookieDomain: 'auto',
	// see https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers

	initialBaseMap: "terrain", // "osm", "hybrid", "roadmap" or "terrain"

	debug: true,

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
	urbanTepTifPixelSize: 75*75
};
