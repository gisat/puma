let csv = require('csv');
let logger = require('../../common/Logger').applicationWideLogger;
let Promise = require('promise');

class CsvParser {
	constructor(text) {
		this._text = text;
	}

	objects() {
		return new Promise(resolve, reject => {
			csv.parse(this._text, function(error, result){
				if(error){
					logger.error(`ERROR CsvParser#objects csv.parse:` + error);
					reject(error);
				} else {
					var header = result[0];
					let data = [];
					result.map((item, i) => {
						var record = {};
						header.map((column, j) => {
							record[column] = item[j];
						});

						if (i > 0){
							data.push(record);
						}
					});
					resolve(data);
				}
			});

		});
	}
}

module.exports = CsvParser;