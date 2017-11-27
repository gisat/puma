let _ = require('underscore');

/**
 * It represents Valid Layer with everything it entails. In this case it means database table, base table, view table
 * and associated layer references.
 */
class ValidLayers {
	constructor(pgPool, mongo, sourceSchema, targetSchema) {
		this._pgPool = pgPool;
		this._mongo = mongo;

		this._sourceSchema = sourceSchema;
		this._targetSchema = targetSchema;
	}

	/**
	 * It creates the source table. Creates the base table and then based on the provided information it needs
	 * @param id {Number} Id of the current layer. It is used for base layer reference and therefore also the creation
	 *    of the view.
	 * @param name {String} Name of the layer in the database.
	 * @param columns {Array} Every object in the array - {attribute: 120, column: 'population', type: 'int'}; For now only numeric values are accepted
	 * @param values {Array} The array consists of arrays of values and they must be in the same order as columns.
	 * @param location {Number} Id of the location to which this layer belongs
	 * @param year {Number} Id of the year to which this layer belongs
	 * @param areaTemplate {Number} Id of the area template to which this layer belongs
	 * @param attributeSet {Number} Id of the attribute set to which this columns in this layer belongs. Currently only one is supported.
	 */
	add(id, name, columns, values, location, year, areaTemplate, attributeSet) {
		return this.createPostgreSqlLayer(id, name, columns, values, attributeSet).then(() => {
			return this.createMongoLayerReferences(id, name, columns, location, year, areaTemplate, attributeSet);
		});
	}

	/**
	 * It creates all layer references.
	 * @private
	 * @param id {Number} Id of the current layer. It is used for base layer reference and therefore also the creation
	 *    of the view.
	 * @param name {String} Name of the layer in the database.
	 * @param columns {Array} Every object in the array - {attribute: 120, column: 'population', type: 'int'}; For now only numeric values are accepted
	 * @param location {Number} Id of the location to which this layer belongs
	 * @param year {Number} Id of the year to which this layer belongs
	 * @param areaTemplate {Number} Id of the area template to which this layer belongs
	 * @param attributeSet {Number} Id of the attribute set to which this columns in this layer belongs. Currently only one is supported.
	 */
	createMongoLayerReferences(id, name, columns, location, year, areaTemplate, attributeSet) {
		return this._mongo.collection('layerref').insertMany([{
			"_id": id,
			"layer": `geonode:${name}`,
			"location": location,
			"year": year,
			"active": true,
			"areaTemplate": areaTemplate,
			"isData": false,
			"fidColumn": "fid",
			"dataSourceOrigin": "geonode"
		}, {
			"_id": 1000 + id,
			"layer": `geonode:${name}`,
			"location": location,
			"year": year,
			"columnMap": columns,
			"attributeSet": attributeSet,
			"active": true,
			"areaTemplate": areaTemplate,
			"isData": true,
			"fidColumn": "fid",
			"dataSourceOrigin": "geonode"
		}]);
	}

	/**
	 * It creates all the structures in the PostgreSQL necessary for layer. Meaning the source table, base table and
	 * views layer.
	 * @private
	 * @param id {Number} Id of the current layer. It is used for base layer reference and therefore also the creation
	 *    of the view.
	 * @param name {String} Name of the layer in the database.
	 * @param columns {Array} Every object in the array - {attribute: 120, column: 'population', type: 'int'}; For now only numeric values are accepted
	 * @param values {Array} The array consists of arrays of values and they must be in the same order as columns.
	 * @param attributeSet {Number} Id of the attribute set to which this columns in this layer belongs. Currently only one is supported.
	 */
	createPostgreSqlLayer(id, name, columns, values, attributeSet) {
		let fullTableName = `${this._sourceSchema}.${name}`;
		let additionalColumns = ``;
		let additionalColumnsViews = ``;
		columns.forEach(column => {
			additionalColumns += ` ${column.column} ${column.type}, `;
			additionalColumnsViews += ` au.${column.column} as as_${attributeSet}_attr_${column.attribute}, `;
		});

		let inserts = ``;
		values.forEach((row, index) => {
			let values = ``;
			row.forEach(value => {
				if(_.isNumber(value)) {
                    values += ` ${value}, `;
                } else {
                    values += ` '${value}', `;
				}
			});
			inserts += `INSERT INTO ${fullTableName} VALUES (${index}, 'Name_${index}', ${values} '0106000020E6100000010000000103000000010000007C000000207D7901F67D27408BD0AB9E93644540B034332BC281274040A1A6D20D64454071E1BF349D85274001B391FA8563454081CD8FBAFB8A27401BB449CEC86245405F7A32D4689B2740B644D71086604540B0A0282427A3274016796E3E755F454060EC822460942740872B2285845A45401F92DE14AF902740FF04BB914859454020CE6F9868902740BAC627013159454011D679936096274034472D43B9554540703691990B9C27400DF9443B6E524540EF9DF5D00E9027400D7D79DD23514540E17D9441507D274058C517481F4F454050BAB631227427401BB9D249224E454081FBC7F12C5D27400B0C6A94A94B4540DF4E6291D8422740CBE3C3F3D3484540016C66D9053E27403CA2AB074F484540007561048A382740FA58EAE6B747454030FE62B6642927408781C57E16464540202E212966262740BE478E2AED44454090336FBED91E27400CCE929FFF41454052055EBED91E27407CEB859FFF4145409FB1AA0A7F292740BBEAEF4EAD4045407F1D1053E83127409A41B500A23F454000E427037735274057D281F3303F4540E002EFE4D33B27404EAA74BE663E4540109CC9DE223C2740681552711C39454090FCFA21363C274007E0F01FD2374540AFC2974505112740C770896A1838454051336547AD0F27404A34609A1A384540E0240CF1B20C274029090D731F3845403FECA307C9FF26408A3649773438454090B77BB94FFA2640E2DADA5F3D384540CF492A32BEF62640213DC614D4364540BF2DA97FB5F02640421A692A7134454060098A1F63E626404B4290205C304540E03E7FB6E2B526403586F9851A334540D08EF5F8B0A12640FDE7B8F93E34454051AC6F5BB98E2640AC0D56A851354540F08D40BCAE8726408058C0A1B7354540EFA145B6F36D26409A85723FA7344540518A3CBB0F6B2640968FF94D43334540A1FF206C5A66264081B0CA87FF304540F011178046612640AD7FF03E8E2E4540111254A1425A2640C7CDEE05242F45403F752C5E4843264028910D9C0E3145404E66E8E4B43926408DFC9C10DB3145408081069B3A332640C9A5265E65324540712906483431264092BB59204138454031FC764CBC3C2640F425E9C7FE37454030C6F99B50502640384E94218E374540200C624C6C5E26402E183B7E6F3B4540D032FE7DC6612640EF1BE83E0042454050EA059FE650264081A8D9A0F6474540C021BC1AF9442640A85B3FFA23474540605CAB3DEC412640E8E8CF1BEE4645407033F1A9C4352640810E92471C4C454090C599F4313326402DA94D06354D4540A06140A3322E26406A3BD846564F4540C181EFE26F2B264050DC797F835045400F6104399A262640F79CEC6BF35045401052E97B9B06264027AD121FD8534540901614730103264073CBA0E10E55454070CFD90242E725409C544901695E4540E060427424CA254092F851A78C604540C1D7A6EB68B02540C503DAAB70624540912BF697DD7B25408F8D38014D6645403F0967C4C07D2540E728734E3B67454091A8A9445D8B25409BADAADDF16D4540203A234A7B8E2540F6F868737B6F454090FB027AE1922540F3322CE3A6714540102790BEBB692540997DDE1CAE784540301ABBBEBB692540613AE91CAE784540D0F5DD592D80254078864CC11A7E454080F7CA75807F2540DDF3EC42F27E4540BF274A42227D2540028345E2E581454060E68F8A7B9025407D84019C29824540CFD7D825AA9725408B2B96BF428245406F8F183DB79025409C06CBA0DA87454070FF5D5D1D8225408411F4BE75884540500B43564A792540B1EF417ED38845400014479F086E2540718ED3144B894540F10FBB9B196D25408FB50C0055894540FF335677396F2540C5D74ED0E48D4540700FD07D396F2540A78439DEE48D4540316D8DE2FE782540E8C8C85BCD904540FF80ED60C482254078F7F5E0B5934540205E4156948725400D0C6DEEC6934540D08D16197D932540C430C521F19345409FBE3959F3A02540B404A1D52094454030629867B3D22540B19E1620D1944540B02062DE3EF02540248DB25AE195454061CB89F795152640B9964D6939974540BF7F8120401E2640EC3CAD3F89974540816B965438242640CBC4E40F25914540B1CE177B2F2A2640AEEABE00C28A45402162669A0E2D26404A81BD17C08A4540C081B15B574526402D9B5BF0AF8A454052E826CCDC582640F6C00FF4A28A4540E05A9416848626408701AD95848A4540D06105B39A89264082AAC287828A454091B74639D58B2640BE5B400C818A4540303253DEB792264099FABD777C8A45405F2C709300992640B6EEA149788A45408FD906CD329D264076AF0E7F758A454060698CB543B32640E6D367D1668A4540DF70CB4752BA264042C3AD1F628A4540606954E064B32640E4922F056B7C45408027C6DEFDE92640CD6C15618A7A4540A04BEC86DFFA264056BA51A5467C4540F0B1F0E1D1FC2640CC4C72E0797C4540F08D40BCAE072740D1C0A2BF977D4540CFA96D49620A2740093E0E57767D4540FF8E421D4C1727401C671CA3D67C4540C1B8E2E2A824274039D69F61317C45402088669E5C3F2740C775D4DFD976454020B569CFD93F27405060D9850075454000299583E83F27407B296DEDC87445402F17848F14402740D18CE562227445403157A61193412740566B1A1D7C6E4540C1516518774327403DF6E6FF556745400F6B0D2EE86127401A869464E6654540106538E5A4622740A886B27DDD654540207D7901F67D27408BD0AB9E93644540');`;
		});

		return this._pgPool.query(`
					CREATE TABLE ${fullTableName} (gid serial, name text, ${additionalColumns} the_geom geometry);
					
					${inserts}
					
					CREATE TABLE ${this._targetSchema}.base_${id} AS ( 
						SELECT gid as gid,
						name as name, 
						ST_Centroid(ST_Transform(the_geom, 4326)) AS centroid,
						ST_Area(ST_Transform(the_geom, 4326)::geography) AS area,
						ST_Length(ST_Transform(the_geom, 4326)) as length,
						Box2D(ST_Transform(the_geom, 4326)) AS extent
						FROM ${fullTableName}
        			);
        			
        			CREATE VIEW ${this._targetSchema}.layer_${id} AS SELECT base.gid, base.centroid, base.area, base.length, base.extent, au.name, ${additionalColumnsViews} au.the_geom FROM ${this._targetSchema}.base_${id} as base JOIN ${fullTableName} as au on base.gid = au.gid;
				`);

	}
}

module.exports = ValidLayers;