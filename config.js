module.exports = {
	localPort: 3000,

	/*
	Connection String split to pieces for the PostgreSQL.
	 */
	pgDataUser: 'geonode',
	pgDataPassword: 'geonode',
	pgDataDatabase: 'geonode_data',
	pgDataHost: 'localhost',
	pgDataPort: '5432',

	pgSchema: {
		analysis: `analysis`,
		data: `data`,
		metadata: `metadata`,
		permissions: `permissions`,
		views: `views`,
		relations: `relations`,
		dataSources: `dataSources`,
		specific: `specific`,
		application: `application`
	},

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

	toggles: {
		/**
		 * When this flag is set, the EO SSO protocol is used to supply the information about the user.
		 */
		useEoSso: true,

		/**
		 * If only logged in users are allowed, then the all the requests will redirect the user to the login point.
		 */
		loggedOnly: false
	},

	/**
	 * When is isn't allowed for unauthenticated users to access the system, this is the Url to which they will be
	 * redirected instead.
	 */
	notAuthenticatedUrl: 'localhost/tool/',

	remoteProtocol: 'http://',
	remoteAddress: 'localhost:3000',
	projectHome: '/',

	/**
	 * Information necessary to send emails to the users.
	 * host: Hostname of the SMTP server e.g. zimbra.gisat.cz
	 * user: Username of the user using server e.g. puma.geonode@gisat.cz
	 * port: Port of the SMTP service. Usually 587
	 * password: Password of the user e.g. XXXXXXX
	 * from: The email address sending the email e.g. puma.geonode@gisat.cz
	 * subject: Subject of the email. It should contain the core information about the service
     */
	email: {
		host: 'zimbra.gisat.cz',
		user: 'panther@gisat.cz',
		port: 587,
		password: '7Mn3+wXcQ2',
		from: 'panther@gisat.cz',
		subject: 'Panther - Visualisation and analysis platform. Internal'
	}
};
