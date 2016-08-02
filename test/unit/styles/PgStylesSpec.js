var should = require('should');

var PgStyles = require('../../../styles/PgStyles');
var PgPool = require('../../../postgresql/PgPool');
var RestStyle = require('../../../styles/RestStyle');
var DatabaseSchema = require('../../../postgresql/DatabaseSchema');
var config = require('../config');

describe('PgStyles', function () {
	var commonSchema = 'data';
	var schema, pool;
	// Cleanse the database.
	before(function(done){
		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		schema = new DatabaseSchema(pool, commonSchema);
		schema.create().then(function(){
			done();
		});
	});

	describe('#add', function () {
		var styles, restStyle;
		before(function(done){
			styles = new PgStyles(pool, commonSchema);
			restStyle = RestStyle.fixture('1a');
			styles.add(restStyle).then(function() {
				done();
			});
		});

		it('Creates analysis in mongoDB and read it back.', function () {
			return styles.all().should.eventually.have.length(1);
		});

		it('should return valid definition', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].definition();
			}).should.eventually.equal('{"type":"polygon","filterAttributeKey":5,"filterAttributeSetKey":2,"filterType":"attributeCsv","rules":[{"name":"Urban fabric","title":"Urban fabric","appearance":{"fillColour":"#D0091D"},"filter":{"attributeCsv":{"values":"111,112,113"},"attributeInterval":{}}},{"name":"Non-urban artificial areas","title":"Non-urban artificial areas","appearance":{"fillColour":"#AE0214"},"filter":{"attributeCsv":{"values":"120,121,130,140"},"attributeInterval":{}}},{"name":"Natural and semi-natural areas","title":"Natural and semi-natural areas","appearance":{"fillColour":"#59B642"},"filter":{"attributeCsv":{"values":"310,320,330"},"attributeInterval":{}}},{"name":"Water","title":"Water","appearance":{"fillColour":"#56C8EE"},"filter":{"attributeCsv":{"values":"510,512,520"},"attributeInterval":{}}}]}');
		});

		it('should return valid name', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].name();
			}).should.eventually.equal('Name');
		});

		it('should return valid symbology name', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].symbologyName();
			}).should.eventually.equal('Symbology name');
		});

		it('should return valid sld', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].sld();
			}).should.eventually.equal('<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><sld:Name>Style</sld:Name><sld:Title>Style</sld:Title><sld:NamedLayer><sld:UserStyle><sld:FeatureTypeStyle><sld:Rule><sld:Name>Urban fabric</sld:Name><sld:Title>Urban fabric</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>111</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>112</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>113</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#D0091D</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Non-urban artificial areas</sld:Name><sld:Title>Non-urban artificial areas</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>120</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>121</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>130</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>140</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#AE0214</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Natural and semi-natural areas</sld:Name><sld:Title>Natural and semi-natural areas</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>310</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>320</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>330</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#59B642</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule><sld:Rule><sld:Name>Water</sld:Name><sld:Title>Water</sld:Title><ogc:Filter><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>510</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>512</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>5</ogc:PropertyName><ogc:Literal>520</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter><sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#56C8EE</sld:CssParameter></sld:Fill></sld:PolygonSymbolizer></sld:Rule></sld:FeatureTypeStyle></sld:UserStyle></sld:NamedLayer></sld:StyledLayerDescriptor>');
		});

		it('should return valid created', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].created();
			}).should.eventually.eql(new Date(2015,2,2,10,12,20,10));
		});

		it('should return valid created by', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].createdBy();
			}).should.eventually.equal(1);
		});

		it('should return valid changed', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].changed();
			}).should.eventually.eql(new Date(2015,2,2,10,12,20,10));
		});

		it('should return valid changed by', function(){
			return styles.all().then(allStyles => {
				return allStyles[0].changedBy();
			}).should.eventually.equal(1);
		});
	});

	describe('#update', function () {
		var styles, restStyle;
		before(function(done){
			styles = new PgStyles(pool, commonSchema);
			restStyle = RestStyle.fixture('2a');
			styles.add(restStyle).then(function() {
				restStyle._name = 'test1';
				return styles.update(restStyle)
			}).then(function(){
				done();
			});
		});

		it('should return updated name', function(){
			return styles.all().then(allStyles => {
				return allStyles[1].name();
			}).should.eventually.equal('test1');
		});
	});

	after(function(done){
		schema.drop().then(function(){
			done();
		});
	});
});