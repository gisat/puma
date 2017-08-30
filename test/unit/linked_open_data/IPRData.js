let should = require('should');

let IPRData = require('../../../linked_open_data/queries/IPRData');

describe('IPRData', () => {
	describe('#json', ()=>{
		it('returns the json representation of the attributes', done => {
			let data = new IPRData({
				dataset: 'http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/databaseTablePodlaznosti/',
				filters: [{
					"name": "urk_ss_podlaznost_p strecha",
					"objekt": "http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/databaseTablePodlaznosti/strecha",
					"dataset": "http://onto.fel.cvut.cz/ontologies/town-plan/resource/vocab/databaseTablePodlaznosti/",
					"datasetName": "Podlaznosti",
					"key": "strecha",
					"type": "integer",
					"values": [
						"2",
						"2"
					]
				}]
			});

			data.json().then(results => {
				console.log(results);
				done();
			}).catch(err => {
				done(err);
			});
		});
	})
});