let should = require('should');

let IPRDatasets = require('../../../linked_open_data/queries/IPRDatasets');

describe('IPRDatasets', () => {
	describe('#json', ()=>{
		it('returns the json representation of the datasets', done => {
			let datasets = new IPRDatasets(['budova', 'podlazi'],'||');

			datasets.json().then(results => {
				console.log(results);
				done();
			}).catch(err => {
				done(err);
			});
		});
	})
});