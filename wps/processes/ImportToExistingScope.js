const WpsBaseProcess = require('../WpsBaseProcess');

class ImportToExistingScope extends WpsBaseProcess {
	constructor() {
		super();

		this._describe = {
			identifier: `ImportToExistingScope`,
			title: `Import new data to existing Scope`,
			abstract: `There must be valid User in the application. It also assumes that there is at least one valid Scope in the application with associated analytical units.`,
			inputs: {
				data: {
					identifier: `data`,
					title: `Data`,
					abstract: `Input file containing data to import. Name is also used as a part of the name for result attributes.`,
					dataType: `ComplexData`,
					defaultDataType: `image/tiff`,
					supportedDataTypes: [`image/tiff`, `application/zip`],
					unique: true,
					required: true
				},
				scope: {
					identifier: `scope`,
					title: `Scope`,
					abstract: `Id of the scope to which should the import of the data will be limited.`,
					dataType: `Long`,
					unique: true,
					required: true
				},
				place: {
					identifier: `place`,
					title: `Place`,
					abstract: `Id of the pcope to which should the import of the data will be limited.`,
					dataType: `Long`,
					unique: true,
					required: true
				}
			}
		}
	}

	execute() {
		throw new Error('not re-implemented yet');
	}
}

module.exports = ImportToExistingScope;