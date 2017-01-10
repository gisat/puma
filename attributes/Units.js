class Units {
	translate(unitFrom, unitTo) {
		let allowedUnits = ['m2', 'km2', 'ha'];
		if(!unitTo || allowedUnits.indexOf(unitFrom) == -1 || allowedUnits.indexOf(unitTo) == -1) {
			return unitFrom
		}

		// For some unknown reasons is default factor 100 and if it is different it doesn't work correctly.
		let units = {
			m2: 1,
			ha: 10000,
			km2: 1000000
		};

		return units[unitFrom] / units[unitTo];
	}
}

module.exports = Units;