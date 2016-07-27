module.exports = {
	pgDataConnString    : "postgres://geonode:geonode@localhost:5432/geonode_data",
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: 'localhost',
	pgDataPort: '5433',
	pgGeonodeConnString  : "postgres://geonode:TheGeoNodeBigFan@37.205.9.78:5432/geonode",
	mongoConnString : "mongodb://37.205.9.78:27017/test",

	localAddress    : "localhost:4000/tool",
	remoteAddress   : "localhost:4000/tool",
	remoteProtocol  : "http",

	geoserverHost   : "37.205.9.78",
	geoserverPort   : 8080,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",

	geoserver2Host  : "37.205.9.78",
	geoserver2Port  : 8080,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeHost     : "37.205.9.78",
	geonodePath     : "",
	geonodeHome     : "/geonode"
};
