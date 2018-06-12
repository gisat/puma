let supertest = require('supertest');
let should = require('should');
let expect = require('chai').expect;

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');

let PgMetadata = require('../../../metadata/PgMetadata');

describe('PgMetadataCRUD', () => {
	let integrationEnvironment, fixture = {user: null};
	let pgPool, pgSchema;
	let pgMetadata;

	beforeEach(done => {
		integrationEnvironment = new IntegrationEnvironment((app, pool, schema) => {
			pgSchema = schema.schema;
			pgPool = pool;

			pgMetadata = new PgMetadata(pgPool, pgSchema);
		}, fixture);
		integrationEnvironment.setup().then(() => {
			done();
		}).catch(error => {
			logger.error('PgMetadataSpec#beforeEach Error: ', error);
			done(error);
		})
	});

	describe('Create PgScenarioCase with some PgScenario and then delete it', () => {
		it('Execute...', (done) => {
			let createData = {
				scenario_cases: [
					{
						uuid: '6sd15d5s61fs65f1',
						data: {
							name: "Test scenario case",
							scenario_ids: [
								'3sf1s3f1sd3f1s3f'
							]
						}
					}
				],
				scenarios: [
					{
						uuid: '3sf1s3f1sd3f1s3f',
						data: {
							name: "Test scenario"
						}
					}
				]
			};

			let deleteData = {
				scenario_cases: [
					{
						id: 1
					}
				]
			};

			pgMetadata.create(createData)
				.then((result) => {
					expect(result).to.deep.equal(
						{
							scenario_cases: [{
								id: 1,
								uuid: "6sd15d5s61fs65f1",
								data: {
									name: "Test scenario case",
									description: null,
									geometry: null,
									scope_ids: [],
									place_ids: [],
									scenario_ids: [1]
								}
							}],
							scenarios: [{
								id: 1,
								uuid: "3sf1s3f1sd3f1s3f",
								data: {
									name: "Test scenario",
									description: null,
									scenario_case_ids: [1]
								}
							}]
						}
					);
				})
				.then(() => {
					return pgMetadata.delete(deleteData)
				})
				.then((result) => {
					expect(result).to.deep.equal(
						{
							scenario_cases: [
								{
									id: 1,
									deleted: true
								}
							]
						}
					);
					done();
				})
				.catch((error) => {
					done(error);
				})
		});
	});

	describe('Create PgScenarioCase with some scenarioIds and then update them', () => {
		it('Test it...', done => {
			let createData = {
				scenario_cases: [
					{
						uuid: "sd54f6sdfds6fs6",
						data: {
							name: "AAA",
							scenario_ids: [1, 2]
						}
					}
				]
			};

			let updateData = {
				scenario_cases: [
					{
						id: 1,
						data: {
							scenario_ids: [1]
						}
					}
				]
			};

			pgMetadata.create(createData)
				.then((result) => {
					expect(result).to.deep.equal(
						{
							scenario_cases: [{
								id: 1,
								uuid: "sd54f6sdfds6fs6",
								data: {
									name: "AAA",
									description: null,
									geometry: null,
									scope_ids: [],
									place_ids: [],
									scenario_ids: [1, 2]
								}
							}]
						}
					);
					return result;
				})
				.then((result) => {
					return pgMetadata.update(updateData);
				})
				.then((result) => {
					expect(result).to.deep.equal(
						{
							scenario_cases: [{
								id: 1,
								uuid: undefined,
								data: {
									name: "AAA",
									description: null,
									geometry: null,
									scope_ids: [],
									place_ids: [],
									scenario_ids: [1]
								}
							}]
						}
					);
					done();
				})
				.catch((error) => {
					done(error);
				})
		});
	});

	describe('Create single ScenarioCase', () => {
		it('Create PgScenarioCase and return it with new id', done => {
			let data = {
				scenario_cases: [
					{
						uuid: "s1f356sd1fs3d1fs31sdf",
						data: {
							name: "Test scenario case",
							description: "Description of scenario case",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 1],
										[1, 1],
										[0, 0]
									]
								]
							},
							scope_ids: [1],
							place_ids: [1],
							scenario_ids: [1]
						}
					}
				]
			};

			pgMetadata.create(data)
				.then((result) => {
					expect(result).to.deep.equal(
						{
							scenario_cases: [{
								id: 1,
								uuid: "s1f356sd1fs3d1fs31sdf",
								data: {
									name: "Test scenario case",
									description: "Description of scenario case",
									geometry: "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[0,1],[1,1],[0,0]]]}",
									scope_ids: [1],
									place_ids: [1],
									scenario_ids: [1]
								}
							}]
						}
					);
					done();
				})
				.catch((error) => {
					done(error);
				})
		});

		it('Create PgScenarioCase with PgScenario and return it with new ids', done => {
			let data = {
				scenario_cases: [
					{
						uuid: "s1f356sd1fs3d1fs31sdf",
						data: {
							name: "Test scenario case",
							description: "Description of scenario case",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 1],
										[1, 1],
										[0, 0]
									]
								]
							},
							scope_ids: [1],
							place_ids: [1],
							scenario_ids: ["65sd4f56sdfds6fds56fs6ds1fs36"]
						}
					}
				],
				scenarios: [
					{
						uuid: "65sd4f56sdfds6fds56fs6ds1fs36",
						data: {
							name: "Test scenario",
							description: "Description of test scenario"
						}
					}
				]

			};

			pgMetadata.create(data)
				.then((result) => {
					expect(result).to.deep.equal(
						{
							scenario_cases: [{
								id: 1,
								uuid: "s1f356sd1fs3d1fs31sdf",
								data: {
									name: "Test scenario case",
									description: "Description of scenario case",
									geometry: "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[0,1],[1,1],[0,0]]]}",
									scope_ids: [1],
									place_ids: [1],
									scenario_ids: [1]
								}
							}],
							scenarios: [{
								id: 1,
								uuid: "65sd4f56sdfds6fds56fs6ds1fs36",
								data: {
									name: "Test scenario",
									description: "Description of test scenario",
									scenario_case_ids: [1]
								}
							}]
						}
					);
					done();
				})
				.catch((error) => {
					done(error);
				})
		});
	});

	afterEach(done => {
		integrationEnvironment.tearDown().then(() => {
			done();
		}).catch(error => {
			logger.error(`PgMetadataSpec#tearDown Error: `, error);
			done(error);
		});
	});
});