module.exports = {
	/* This specifies ports on which the test server will be run. */
	port: 3103,

	pgDataConnString: "postgres://geonode:geonode@localhost/geonode_data",
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: 'localhost',
	pgDataPort: '5432',
	postgreSqlSchema: 'data_test',
	pgGeonodeConnString  : "postgres://geonode:geonode@localhost/geonode",
	mongoConnString : "mongodb://localhost:27017/panther_test",

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
	geoserver2Path  : "/geoserver_i2",
	geoserver2Username  : "admin",
	geoserver2Password  : "geoserver",
	geoserver2Workspace : "puma",

	geonodeHost     : "localhost",
	geonodePath     : "/",
	geonodeHome     : "/",
	geonodeProtocol : "http",
	geonodePort     : 80,

	/**
	 * AWS related credentials
	 */
	aws: {
		name: 'gisat.eo4sd-products',
		accessKeyId: 'AKIAZEBQQSGAJGV2RWIS',
		secretAccessKey: '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'
	}
};
