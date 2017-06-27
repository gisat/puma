let should = require('should');

let IPRAttributes = require('../../../linked_open_data/queries/IPRAttributes');

describe('IPRAttributes', () => {
	describe('#json', ()=>{
		it('returns the json representation of the attributes', done => {
			let attributes = new IPRAttributes(['strecha'],'||');

			attributes.json().then(results => {
				console.log(results);
				done();
			}).catch(err => {
				done(err);
			});
		});
	})
});