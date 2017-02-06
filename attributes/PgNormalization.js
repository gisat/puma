let Promise = require('promise');

let Units = require('./Units');
let FilteredMongoAttributes = require('./FilteredMongoAttributes');

/**
 * This class handles normalization of data in the PostgreSQL. Mainly it is focused on normalizing the analysis after
 * their run.
 */
class PgNormalization {
	constructor(pool, mongo, schema) {
		this._pool = pool;
		this._mongo = mongo;
		this._schema = schema;
		this._units = new Units();
	}

	/**
	 * It receives performed analysis and updates the results based on the units used in the analysis. There are three
	 * potential attributes: resulting attribute, normalization attribute, calculated attribute.
	 * @param analysis {Object} It represents the template for the analysis which was performed
	 * @param analysis.attributeMap {Object[]} Array containing information about all used attributes and used types of operations
	 * @param analysis.type {String} Type of the analysis, which was run. Normalization happens only for spatial aggregation.
 	 * @param performedAnalysis {Object} It represents the analysis which was run in the end.
	 * @param performedAnalysis._id {Number} Id of the performed analysis. Used as a part of the name of the table.
	 * @param performedAnalysis.featureLayerTemplates {Number[]} Analytical units to which the analysis belongs.
	 * @returns {Promise.<*>} After the promise will be resolved the data are already updated
	 */
	analysis(analysis, performedAnalysis) {
		let columns = analysis.attributeMap;
		return Promise.all(performedAnalysis.featureLayerTemplates.map(areaTemplate => {
			return this.analysisTable(columns, performedAnalysis._id, areaTemplate, analysis.type);
		}));
	}

	analysisTable(columns, performedId, areaTemplateId, type) {
		let tableToUpdate = `an_${performedId}_${areaTemplateId}`;
		let promises = [];
		columns.forEach(column => {
			let columnName = `as_${column.attributeSet}_attr_${column.attribute}`;
			if(type == 'spatialagg') {
				promises.push(this.getFactorForColumn(column).then(factor => {
					return this._pool.query(`UPDATE ${this._schema}.${tableToUpdate} SET "${columnName}" = "${columnName}" * ${factor}`);
				}));
			}
		});
		return Promise.all(promises);
	}

	/**
	 * It retrieves the information about the attributes and based on them counts the factor of the result.
	 * @private
	 * @param column {Object}
	 * @param column.type {String} It represents type of the operation performed over this attribute combination.
	 * @param column.attribute {Number} Id of the result attribute
	 * @param column.normAttribute {Number} Id of the normalization attribute against area or second attribute
	 * @param column.calcAttribute {Number} Id of the second attribute used in case of normalizing attribute against
	 * 	attribute
	 * @returns {Promise}
	 */
	getFactorForColumn(column) {
		let unitFrom, unitTo;
		let attribute, normalizationAttribute, calculationAttribute;
		return new FilteredMongoAttributes({_id: {$in: [column.attribute, column.normAttribute, column.calcAttribute]}}, this._mongo).json().then(attributes => {
			if(!attributes) {
				return 1;
			} else {
				attributes.forEach(pAttribute => {
					if(pAttribute._id == column.attribute) {
						// Represents result and therefore also associated units.
						attribute = pAttribute;
					}
					if(pAttribute._id == column.normAttribute) {
						normalizationAttribute = pAttribute;
					}
					if(pAttribute._id == column.calcAttribute) {
						calculationAttribute = pAttribute;
					}
				})
			}

			if(column.type == 'sumarea' || column.type == 'avgarea') {
				unitFrom = 'm2'; // It is based on the attribute. Attribute represents result. The area is always in square meters.
				unitTo = attribute.units;

				return this._units.translate(unitFrom, unitTo, false);
			} else if(column.type == 'avgattrarea') {
				unitFrom = 'm2'; // Source information is area and it is always in square meters.
				unitTo = normalizationAttribute.units;

				let factor = this._units.translate(unitFrom, unitTo, false);
				return this._units.translateFromFactorToUnits(factor, attribute.units);
			} else if(column.type == 'avgattrattr') {
				unitFrom = calculationAttribute.units;
				unitTo = normalizationAttribute.units;

				let factor = this._units.translate(unitFrom, unitTo, false);
				return this._units.translateFromFactorToUnits(factor, attribute.units);
			} else {
				return 1;
			}
		});
	}
}

module.exports = PgNormalization;