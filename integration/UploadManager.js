const fse = require('fs-extra');
const _ = require('lodash');
const uuid = require('uuid');

const Audit = require('../data/Audit');

class UploadManager {
	constructor(pgPool, pgSchema, pantherUploadStoragePath) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._pantherUploadStoragePath = pantherUploadStoragePath;

		this._init();
	}

	/**
	 * Add new file
	 * @param options
	 */
	add(options) {
		console.log(`UploadManager#add: options`, options);

		let uploadKey = options.uploadKey || uuid();
		return this._createDirectory(`${this._pantherUploadStoragePath}/${uploadKey}`)
			.then(() => {
				return this._moveFile(options.path, `${this._pantherUploadStoragePath}/${uploadKey}/${options.name}`);
			})
			.then(() => {
				return this._createDbRecord({
					path: `${this._pantherUploadStoragePath}/${uploadKey}/${options.name}`,
					name: options.name,
					owner: options.user.id,
					uuid: uploadKey,
					customName: options.customName || ``
				})
			})
			.then(() => {
				return {
					uploadKey
				}
			});
	}

	/**
	 * Get stored files based on filter or get all records if filter is not specified
	 * @param filter
	 */
	get(filter) {
		let query = [	];
		query.push(`SELECT * FROM "${this._pgSchema}"."uploads" AS u`);
		if(filter) {
			let where = [];
			if(filter.path) {
				where.push(`path LIKE '%${filter.path}%'`);
			}
			if(filter.name) {
				where.push(`name LIKE '%${filter.name}%'`);
			}
			if(filter.owner) {
				where.push(`owner = ${Number(filter.path)}`);
			}
			if(filter.uuid) {
				where.push(`uuid = '%${filter.uuid}%'`);
			}
			if(filter.customName) {
				where.push(`custom_name LIKE '%${filter.customName}%'`);
			}
			if(filter.createdFrom) {
				where.push(`created >= '${filter.createdFrom}'`);
			}
			if(filter.createdTo) {
				where.push(`created <= '${filter.createdTo}'`);
			}
			if(where.length) {
				query.push(`WHERE ${where.join(` AND `)}`);
			}
		}
		query.push(`;`);

		return this._pgPool.query(query.join(' '))
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	/**
	 * Remove uploaded file and it's metadata based on it's uuid
	 * @param uuid
	 */
	remove(uuid) {
		return this._removeDirectoryOrFile(`${this._pantherUploadStoragePath}/${uuid}`)
			.then(() => {
				return this._removeDbRecord(uuid);
			})
	}

	/**
	 * Remove information about uploaded file from database
	 * @param uuid
	 * @private
	 */
	_removeDbRecord(uuid) {
		let query = [
			`DELETE FROM "${this._pgSchema}"."uploads"`,
			`WHERE uuid = '${uuid}';`
		];
		return this._pgPool.query(query.join(' '))
			.then((queryResult) => {
				return !!queryResult.rowCount;
			});
	}

	/**
	 * Remove directory or file (rm -rf)
	 * @param path
	 * @returns {*}
	 * @private
	 */
	_removeDirectoryOrFile(path) {
		return fse.remove(path);
	}

	/**
	 * Store informations about uploaded file into database
	 * @param metadata
	 * @private
	 */
	_createDbRecord(metadata) {
		let query = [
			`INSERT INTO "${this._pgSchema}"."uploads"`,
			`(path, name, owner, uuid, custom_name)`,
			`VALUES`,
			`('${metadata.path}', '${metadata.name}',  ${metadata.owner} , '${metadata.uuid}', '${metadata.customName}');`
		];
		return this._pgPool.query(query.join(' '));
	};

	/**
	 * Create directory on path if not exists (mkdir -p)
	 * @param path
	 * @returns {*}
	 * @private
	 */
	_createDirectory(path) {
		return fse.ensureDir(path);
	}

	/**
	 * Move file or directory from source path to destination path
	 * @param source
	 * @param destination
	 * @returns {*}
	 * @private
	 */
	_moveFile(source, destination) {
		return fse.move(source, destination);
	}

	/**
	 * Initialize upload manager enviroment
	 * @private
	 */
	_init() {
		return this._initPgTable()
			.then(() => {
				return this._initFs();
			})
			.catch((error) => {
				console.log(`UploadManager#init: error`, error);
			});
	}

	/**
	 * Check for metadata table and create or modify it when it's needed
	 * @private
	 */
	_initPgTable() {
		let query = [
			`BEGIN;`,
			`CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."uploads" (uuid UUID PRIMARY KEY DEFAULT gen_random_uuid());`,
			`ALTER TABLE "${this._pgSchema}"."uploads" ADD COLUMN IF NOT EXISTS path TEXT;`,
			`ALTER TABLE "${this._pgSchema}"."uploads" ADD COLUMN IF NOT EXISTS name TEXT;`,
			`ALTER TABLE "${this._pgSchema}"."uploads" ADD COLUMN IF NOT EXISTS owner INT;`,
			`ALTER TABLE "${this._pgSchema}"."uploads" ADD COLUMN IF NOT EXISTS custom_name TEXT;`,
			`ALTER TABLE "${this._pgSchema}"."uploads" ADD COLUMN IF NOT EXISTS created TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
			`COMMIT;`
		];

		return this._pgPool.query(query.join(' '));
	}

	/**
	 * Check for directory where are uploaded files stored and create it if not exists
	 * @returns {*}
	 * @private
	 */
	_initFs() {
		return fse.ensureDir(this._pantherUploadStoragePath);
	}
}

module.exports = UploadManager;