module.exports = {
	localHost       : "10.0.75.2",
	localPort       : 4000,
	localPath       : "",

	remoteProtocol  : "http",
	remoteAddress   : "10.0.75.2:4000",
	projectHome     : "",

	pgDataConnString   : "postgres://geonode:geonode@10.0.75.2:5432/geonode_data",
	pgGeonodeConnString: "postgres://geonode:geonode@10.0.75.2:5432/geonode",
	mongoConnString    : "mongodb://10.0.75.2:27017/panther",

	workspaceSchemaMap: {
		geonode: "public",
		analysis: "analysis"
	},

	geoserverHost   : "10.0.75.2",
	geoserverPort   : 8080,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",
	/*
	 * It contains workspace, which is used when storing and generating things in the geoserver.
	 */
	geoserverWorkspace: "puma",

	geoserver2Host  : "10.0.75.2",
	geoserver2Port  : 8080,
	geoserver2Path  : "/geoserver",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeProtocol : "http",
	geonodeHost     : "10.0.75.2",
	geonodePort			: 80,
	geonodePath     : "/",
	geonodeHome     : "/",

	/**
	 * Full URL of the geonode usable for the requests.
	 */
	geonodeUrl: "http://10.0.75.2:80/",

	/**
	 * Full URL of the GeoServer usable for the requests.
	 */
	geoServerUrl: "http://10.0.75.2:80/geoserver/",

	/**
	 * Data store used for storing the layers.
	 */
	geoServerDataStore: "datastore",

	/**
	 * Path to the directory where temporary sld will be stored. It is used mainly for debugging. It is about thematic
	 * maps and the borders of the analytical units.
	 */
	temporarySldFilesPath: "/tmp/",

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
		useHeader: false,
		useWBFooter: false,
		allowPumaHelp: false,
		allowDownloadsLink: false,
		usePumaLogo: false,
		advancedFiltersFirst: false,
		/**
		 * When this flag is set, the EO SSO protocol is used to supply the information about the user.
		 */
		useEoSso: true,

		/**
		 * If only logged in users are allowed, then the all the requests will redirect the user to the login point.
		 */
		loggedOnly: false
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
	environment: 'production',

	/*
	In this Schema all additional data ni PostgreSQL, such as Symbologies will be stored.
	 */
	postgreSqlSchema: 'data_test',

	/*
	 * Schema containing produced tables and views - base_ and layers_ with the data for usge in Panther.
	 */
	viewsSchema: 'views',

	/*
	Connection String split to pieces for the PostgreSQL.
	 */
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: '10.0.75.2',
	pgDataPort: '5432',
	
	/*
	This is the directory where Puma generates images to be downloaded as snapshots. It doesn't have to last long. 
	*/
	snapshotDirectory: '/tmp/',

	/*
	 This is the directory where will be temporary files for export generated.
	 */
	exportDirectory: '/tmp/',

	/*
	 * Destination of temporary downloaded files for the WPS process
	 */
	temporaryDownloadedFilesLocation: '/tmp/',

	isUrbis: false,
	
	/**
	 * Name of the application used for watching the servers.
	 */
	appName: 'Localhost',

	/**
	 * When is isn't allowed for unauthenticated users to access the system, this is the Url to which they will be
	 * redirected instead.
	 */
	notAuthenticatedUrl: '10.0.75.2/tool/'
};
