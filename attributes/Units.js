let logger = require('../common/Logger').applicationWideLogger;

/**
 * Translates between different units available in the application.
 */
class Units {
	/**
	 * It translates from unitFrom to unitTo to receive a factor used to transposing the data. There are certain specific
	 * use cases. There might
	 * @param unitFrom Any of standard units
	 * @param unitTo Any of standard units
	 * @param percentage If true it means that the data should be returned as percentage.
	 * @returns {number}
	 */
	translate(unitFrom, unitTo, percentage) {
		percentage = percentage ? 100: 1;

		logger.info(`Units#translate From: ${unitFrom} To: ${unitTo} Percentage: ${percentage}`);

		let allowedUnits = ['m2', 'km2', 'ha'];
		let units = {
			m2: 1,
			ha: 10000,
			km2: 1000000
		};

		if(!unitFrom && !unitTo) {
			logger.error(`Units#translate Incorrect units from and to.`);
			return percentage;
		}

		if(!unitTo) {
			if(allowedUnits.indexOf(unitFrom) != -1) {
				// Correct units give correct factor.
				return units[unitFrom] * percentage;
			} else {
				return percentage;
			}
		}

		if(!unitFrom) {
			if(allowedUnits.indexOf(unitTo) != -1) {
				// Correct units give correct factor.
				return 1 / (units[unitTo] * percentage);
			} else {
				return 1 / percentage;
			}
		}

		return (units[unitFrom] / units[unitTo]) * percentage;
	}
}

module.exports = Units;