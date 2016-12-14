module.exports = {
	/* This specifies ports on which the test server will be run. */
	port: 3000,

	pgDataConnString: "postgres://geonode:geonode@10.0.75.2:5432/geonode_data",
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: '10.0.75.2',
	pgDataPort: '5432',
	postgreSqlSchema: 'data_test',
	pgGeonodeConnString  : "postgres://geonode:geonode@10.0.75.2:5432/geonode",
	mongoConnString : "mongodb://10.0.75.2:27017/panther_test",

	localAddress    : "10.0.75.2:4000/tool",
	remoteAddress   : "10.0.75.2:4000/tool",
	remoteProtocol  : "http",

	geoserverHost   : "10.0.75.2",
	geoserverPort   : 80,
	geoserverPath   : "/geoserver",
	geoserverUsername : "admin",
	geoserverPassword : "geoserver",
	geoserverWorkspace : "puma",

	geoserver2Host  : "10.0.75.2",
	geoserver2Port  : 80,
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeHost     : "10.0.75.2",
	geonodePath     : "/",
	geonodeHome     : "/",
	geonodeProtocol : "http",
	geonodePort     : 80
};
