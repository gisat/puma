const PgLpisCheckInternalCases = require('../specific/PgLpisCheckInternalCases');

const config = require('../config');

class LpisCheckInternalCaseGetter {
	constructor(pgPool) {
		this._pgPool = pgPool;
	}

	getCase(request, response) {
		Promise
			.resolve()
			.then(() => {
				if (!_.find(request.session.user.groups, (group) => {
					return group.name === "brigadnik";
				})) {
					throw new Error("user is not in correct group");
				}
			})
			.then(() => {
				return this.getAvailableCaseKeyForUser(request.session.user.key || request.session.user.id);
			})
			.then((caseKey) => {
				return new PgLpisCheckInternalCases(this._pgPool, config.pgSchema.specific).get(
					{
						filter: {
							key: caseKey
						}
					},
					request.session.user,
					{}
				)
			})
			.then((getResult) => {
				response.status(200).send(getResult.data[0]);
			})
			.catch((error) => {
				console.log(error);
				response.status(500).send({
					success: false,
					message: error.message
				});
			})
	}

	async getAvailableCaseKeyForUser(userKey) {
		let client = await this._pgPool.connect();

		await client.query(
			`BEGIN`
		);

		let queryResult = await client.query(
			`SELECT key FROM "${config.pgSchema.specific}"."${PgLpisCheckInternalCases.tableName()}" WHERE "status" = 'CREATED' AND ("workerKey" = '${userKey}' OR "workerKey" IS NULL) ORDER BY "workerKey" LIMIT 1;`
		);

		let caseKey = queryResult.rows[0].key;

		await client.query(
			`UPDATE "${config.pgSchema.specific}"."${PgLpisCheckInternalCases.tableName()}" SET "workerKey" = '${userKey}' WHERE "key" = '${caseKey}'`
		);

		await client.query(
			`COMMIT`
		);

		await client.release();

		return caseKey;
	}
}

module.exports = LpisCheckInternalCaseGetter;