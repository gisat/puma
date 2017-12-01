let dbfFile = require('dbffile');
let fs = require('fs');

class DBFEditor {
	constructor() {

	}

	readDbfFile(path) {
		return dbfFile.open(path);
	}

	updatedDescriptors(dbf) {
		let updated = false;
		for (let fieldDesriptor of dbf.fields) {
			if (!fieldDesriptor.name.match(/^[a-zA-Z_].*/)) {
				fieldDesriptor.name = `_${fieldDesriptor.name}`;
				updated = true;
			}
			if (fieldDesriptor.name.includes(' ')) {
				fieldDesriptor.name = fieldDesriptor.name.replace(/\ /g, '_');
				updated = true;
			}
		}
		return updated;
	}

	createUpdatedDbfFile(updatedDbf) {
		let file = updatedDbf.path.split("/").pop();
		let path = updatedDbf.path.substring(0, updatedDbf.path.lastIndexOf("/"));
		let fileName = file.substring(0, file.lastIndexOf("."));
		return dbfFile.create(`${path}/${fileName}_updated.dbf`, updatedDbf.fields)
			.then(dbf => {
				return updatedDbf.readRecords()
					.then(rows => {
						return dbf.append(rows);
					});
			})
			.then(() => {
				fs.renameSync(`${path}/${fileName}.dbf`, `${path}/${fileName}.dbf.bak`);
				fs.renameSync(`${path}/${fileName}_updated.dbf`, `${path}/${fileName}.dbf`);
				fs.chmodSync(`${path}/${fileName}.dbf`, 511);
				fs.unlinkSync(`${path}/${fileName}.dbf.bak`);
			})
			.then(() => {
				console.log(`#### Given dbf file was updated!`);
			});
	}

	prepareDbfFileForImport(path) {
		let fileDescriptors = [];
		return this.readDbfFile(path)
			.then(dbf => {
				if (this.updatedDescriptors(dbf)) {
					return dbf;
				}
			})
			.then(updatedDbf => {
				if (!updatedDbf) {
					console.log(`#### Given dbf file is correct!`);
				} else {
					return this.createUpdatedDbfFile(updatedDbf);
				}
			});
	}

	getDbfFileDescriptors(path) {
		return this.readDbfFile(path)
			.then((dbf) => {
				return dbf.fields;
			});
	}
}

module.exports = DBFEditor;