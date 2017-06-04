let Promise = require('promise');

class SldStyle {
	constructor(id, style) {
		this._id = id;
		this._style = style;
	}

	id() {
		return Promise.resolve(this._id);
	}

	sld() {
		return Promise.resolve(this._style);
	}
}

module.exports = SldStyle;