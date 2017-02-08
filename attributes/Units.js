let logger = require('../common/Logger').applicationWideLogger;

/**
 * Translates between different units available in the application.
 */
class Units {
	constructor() {
		this.units = {
			m2: 1,
			ha: 10000,
			km2: 1000000
		};
		this.allowedUnits = ['m2', 'km2', 'ha'];
	}

	/**
	 * It translates from unitFrom to unitTo to receive a factor used to transposing the data. There are certain specific
	 * use cases. There might
	 * @param unitFrom Any of standard units
	 * @param unitTo Any of standard units
	 * @param percentage If true it means that the data should be returned as percentage.
	 * @returns {number}
	 */
	translate(unitFrom, unitTo, percentage) {
		logger.info(`Units#translate From: ${unitFrom} To: ${unitTo} Percentage: ${percentage}`);

		percentage = percentage ? 100: 1;

		if(!unitFrom && !unitTo) {
			logger.error(`Units#translate Incorrect units from and to.`);
			return percentage;
		}

		if(!unitTo || this.allowedUnits.indexOf(unitTo) == -1) {
			if(this.allowedUnits.indexOf(unitFrom) != -1) {
				// Correct units give correct factor.
				return this.units[unitFrom] * percentage;
			} else {
				return percentage;
			}
		}

		if(!unitFrom || this.allowedUnits.indexOf(unitFrom) == -1) {
			if(this.allowedUnits.indexOf(unitTo) != -1) {
				// Correct units give correct factor.
				return this.units[unitTo] * percentage;
			} else {
				return percentage;
			}
		}

		return (this.units[unitFrom] / this.units[unitTo]) * percentage;
	}

	/**
	 * It is used whenever you already have some factor as part of the whole process and want to get factor against
	 * other units. The units represents units to.
	 * @param factor {Number} Factor which should be applied to result to transform it to correct units.
	 * @param units {String}
	 * @returns {Number}
	 */
	translateFromFactorToUnits(factor, units) {
		if(!units || this.allowedUnits.indexOf(units) == -1) {
			return factor;
		}

		return factor / this.units[units];
	}
}

module.exports = Units;