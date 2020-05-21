const ptr4 = {
	clusterPorts: [9850, 9851, 9852, 9853, 9854, 9855, 9856, 9857, 9858, 9859],
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
	}
};

module.exports = ptr4;
