module.exports = {
	pgDataConnString    : "postgres://geonode:geonode@10.0.75.2:5432/geonode_data",
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: '10.0.75.2',
	pgDataPort: '5432',
	pgGeonodeConnString  : "postgres://geonode:geonode@10.0.75.2:5432/geonode",
	mongoConnString : "mongodb://10.0.75.2:27017/panther",

	localAddress    : "localhost:4000/tool",
	remoteAddress   : "localhost:4000/tool",
	remoteProtocol  : "http",

	geoserverHost   : "localhost",
	geoserverPort   : 80,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",
	geoserverWorkspace : "puma",

	geoserver2Host  : "localhost",
	geoserver2Port  : 80,
	geoserver2Path  : "/geoserver",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "panther",

	geonodeHost     : "37.205.9.78",
	geonodePath     : "",
	geonodeHome     : "/geonode"
};
