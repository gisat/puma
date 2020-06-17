const ptr4 = {
	clusterPorts: [9850, 9851, 9852, 9853, 9854, 9855, 9856, 9857, 9858, 9859],
	jsonWebToken: {
		string: "57808ccb-b490-44d0-9df9-aa111b56682f",
		cookieMaxAge: 10000
	},
	keepAliveWorkers: true,
	pgConfig: {
		normal: {
			user: `panther`,
			password: `panther`,
			database: `panther`,
			host: `localhost`
		},
		superuser: {
			user: `postgres`,
			password: `postgres`,
			database: `postgres`,
			host: `localhost`
		}
	},
	pgSchema: {
		analysis: `analysis`,
		data: `data`,
		metadata: `metadata`,
		permissions: `permissions`,
		views: `views`,
		relations: `relations`,
		dataSources: `dataSources`,
		specific: `specific`,
		application: `application`,
		various: `various`,
		user: `user`
	},
	jwt: {
		secret: 'changeMe',
		expiresIn: 604800, // seconds (604800 = 7 days)
	},
	password: {
		iteration_counts: 4
	}
};

module.exports = ptr4;
