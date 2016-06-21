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

	remoteDbSchemas: {
		urbis: {
			connString: "postgres://geonode:TheGeoNodeBigFan@37.205.9.78:5432/urbis",
			workspaceMap: [
				{workspace: "urbis_ancillary_layers",
				 remote_schema: "ancillary_layers",
				 local_schema: "_urbis_ancillary_layers"},
				{workspace: "urbis_input",
				 remote_schema: "input",
				 local_schema: "_urbis_input"},
				{workspace: "urbis_results_final",
				 remote_schema: "results_final",
				 local_schema: "_urbis_results_final"}
			]
		}
	},
	geometryColumnNamePattern: "%geom%",

	geoserverHost   : "localhost",
	geoserverPort   : 8080,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",

	geoserver2Host  : "localhost",
	geoserver2Port  : 8181,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeProtocol : "http",
	geonodeHost     : "localhost",
	geonodePort	: 80,
	geonodePath     : "/geonode",
	geonodeHome     : "/geonode",

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
