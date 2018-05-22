class WpsBaseProcess {
	constructor() {
		this._describe = {};
	}

	identifier() {
		if(this._describe.identifier) {
			return this._describe.identifier
		} else {
			throw new Error(`Identifier is not set!`);
		}
	}

	title() {
		if(this._describe.title) {
			return this._describe.title
		} else {
			throw new Error(`Title is not set!`);
		}
	}

	abstract() {
		if(this._describe.abstract) {
			return this._describe.abstract
		} else {
			throw new Error(`Abstract is not set!`);
		}
	}

	inputs() {
		if(this._describe.inputs && Object.keys(this._describe.inputs).length) {
			return this._describe.inputs;
		} else {
			throw new Error(`Inputs are not set!`);
		}
	}

	outputs() {
		if(this._describe.outputs && Object.keys(this._describe.outputs).length) {
			return this._describe.outputs;
		} else {
			throw new Error(`Outputs are not set!`);
		}
	}

	execute(parsedRequest, runningProcesses) {
		throw new Error(`Execute function was not defined!`);
	}
}

module.exports = WpsBaseProcess;