var should = require('should');

var config = require('../config');

var UUID = require('../../../common/UUID');
var RestStyle = require('../../../styles/RestStyle');

// Mechanism for storing information in the database will be created elsewhere. This mechanism will expect all object to
// contain method toPostgreSql. The constructor must also accept options object, which will contain the data structured
// as columnName: columnValue
// Dependency is to create required table in correct postgreSQL database.

describe('Style', function () {
	describe('landCover', function () {
		var landCoverUuid = new UUID().toString();

		describe('#validateDescriptionCreation', function(){
			it('must contain type', function(){
				var result = RestStyle.validateDescriptionCreation({
					"filterAttributeKey": 5, // Filter id of attributeset
					"filterAttributeSetKey": 2, // Id of attributeset which contains attributes for rules.
					"filterType": "attributeCsv", // Comma separated values
					"rules": [
						{
							"name": "Urban fabric",
							"title": "Urban fabric",
							"appearance": {
								"fillColour": "#D0091D"
							},
							"filter": {
								"attributeCsv": {
									"values": "111,112,113" // Values present in the attribute
								},
								"attributeInterval": {}
							}
						}
					]
				});

				should(result).be.exactly(false);
			});
		});
	});
});