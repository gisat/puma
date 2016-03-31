module.exports = {
	localHost       : "127.0.0.1",
	localPort       : 4000,
	localPath       : "/",

	remoteProtocol  : "http",
	remoteAddress   : "localhost:4000",

	pgDataConnString   : "postgres://postgres:postgres@37.205.9.78:5432/geonode_data",
	pgGeonodeConnString: "postgres://postgres:postgres@37.205.9.78:5432/geonode",
	mongoConnString    : "mongodb://37.205.9.78:27017/test",

	workspaceSchemaMap: {
		geonode: "public"
	},

	geoserverHost   : "37.205.9.78",
	geoserverPort   : 8080,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "GeoNodeGeoServerNr1",

	geoserver2Host  : "37.205.9.78",
	geoserver2Port  : 8080,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "GeoNodeGeoServerNr2",
	geoserver2Workspace : "puma",

	geonodeProtocol : "http",
	geonodeHost     : "37.205.9.78",
	geonodePath     : "",
	geonodeHome     : "/geonode",

	debug: true,

	toggles: {
		noGeoserverLayerGroups: false
	},

	allowedOrigins: "http://localhost:5555"
};
