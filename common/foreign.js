var _ = require('underscore');
var pg = require('pg');
var util = require('util');
var Promise = require('promise');

var logger = require('../common/Logger').applicationWideLogger;


var LS_TABLES_SQL = "SELECT cl.oid AS oid, cl.relname AS table_name, ns.nspname AS schema_name \
                     FROM pg_class cl \
                     INNER JOIN pg_namespace ns ON cl.relnamespace = ns.oid \
                     WHERE cl.relkind = 'r' AND cl.relname NOT IN ('spatial_ref_sys') AND ns.nspname = $1;";
var LS_COLUMNS_SQL = "SELECT at.attname AS colname, format_type(at.atttypid, at.atttypmod) AS coltype \
                      FROM pg_attribute at \
                      WHERE at.attnum > 0 AND NOT at.attisdropped AND at.attrelid = $1 \
                      ORDER BY at.attnum;";


function openPgClient(remotePgConnString) {
	return new Promise(function (resolve, reject) {
		var remotePgClient = new pg.Client(remotePgConnString);
		remotePgClient.connect(function (err, client, done) {
			if (err) {
				reject(util.format("Error connecting to remote database: %s", err));
			} else {
				logger.info(util.format("Connected to remote database '%s'.", remotePgConnString));
				resolve(remotePgClient);
			}
		});
	});
}

function queryRemoteTables(remotePgClient, remoteServerName, remoteSchemaName, localSchemaName) {
	var foreignTables = [];
	return new Promise(function (resolve, reject) {
		remotePgClient.query(LS_TABLES_SQL, [remoteSchemaName], function(err, results) {
			if (err) {
				reject(util.format("Error getting list of remote tables for schema '%s': %s", remoteSchemaName, err));
			} else {
				var rows = results.rows;
				for (var i = 0; i < rows.length; i++) {
					foreignTables.push({remote_oid: rows[i].oid,
					                    remote_server_name: remoteServerName,
					                    remote_schema_name: rows[i].schema_name,
					                    remote_table_name: rows[i].table_name,
					                    local_schema_name: localSchemaName,
					                    local_table_name: rows[i].table_name,
					                    columns: null,
					                    sql: null});
				}
				logger.info(util.format("List of remote tables for schema '%s' has been read.", remoteSchemaName));
				resolve();
			}
		});
	}).then(function () {
		var promises = [];
		_.each(foreignTables, function (foreignTable, idx) {
			promises.push(new Promise(function (resolve, reject) {
				remotePgClient.query(LS_COLUMNS_SQL, [foreignTable.remote_oid], function (err, results) {
					if (err) {
						reject(util.format("Error getting list of column for foreign table %s: %s", foreignTable.remote_table_name, err));
					} else {
						var rows = results.rows;
						var columns = [];
						for (var j = 0; j < rows.length; j++) {
							columns.push({column_name: rows[j].colname, column_type: rows[j].coltype});
						}
						foreignTable.columns = columns;
						logger.info(util.format("List of columns for foreign table '%s' has been read.", foreignTable.remote_table_name));
						resolve();
					}
				});
			}));
		});
		return Promise.all(promises);
	}).then(function () {
		return foreignTables;
	});
}

function setCreateTableSql(foreignTables) {
	for (var i = 0; i < foreignTables.length; i++) {
		var foreignTable = foreignTables[i];
		var col_sql = [];
		for (var j = 0; j < foreignTable.columns.length; j++) {
			var col = foreignTable.columns[j];
			col_sql.push(util.format(' "%s" %s', col.column_name, col.column_type));
		}
		var sql = util.format('CREATE FOREIGN TABLE IF NOT EXISTS "%s"."%s" (\n', foreignTable.local_schema_name, foreignTable.local_table_name);
		sql += util.format(" %s)\n", col_sql.join(",\n "));
		sql += util.format("SERVER %s\n", foreignTable.remote_server_name);
		sql += util.format("OPTIONS (schema_name '%s', table_name '%s', updatable 'false');", foreignTable.remote_schema_name, foreignTable.remote_table_name);
		foreignTable.sql = sql;
	}
}

function createForeignTables(localPgClient, foreignTables) {
	var promises = [];
	_.each(foreignTables, function (foreignTable, idx) {
		promises.push(new Promise(function (resolve, reject) {
			var sql = util.format("CREATE SCHEMA IF NOT EXISTS %s;\n", foreignTable.local_schema_name);
			sql += foreignTable.sql;
			localPgClient.query(sql, function(err, results) {
				if (err) {
					reject(util.format("Error creating foreign table '%s': %s", foreignTable.local_table_name, err));
				} else {
					logger.info(util.format("Foreign table '%s' has been created.", foreignTable.local_table_name));
					resolve();
				}
			});
		}));
	});
	return Promise.all(promises);
}

function initForeignTables(localPgClient, remoteDbSchemas) {
	var foreignTables = [];
	new Promise(function (resolve, reject) {
		var remoteServerPromises = [];
		_.each(remoteDbSchemas, function (remoteServerOptions, remoteServerName) {
			remoteServerPromises.push(openPgClient(remoteServerOptions.connString).then(function (remotePgClient) {
				var remoteSchemaPromises = [];
				_.each(remoteServerOptions.workspaceMap, function (mapItem, idx) {
					remoteSchemaPromises.push(queryRemoteTables(remotePgClient, remoteServerName, mapItem.remote_schema, mapItem.local_schema).then(function (fTables) {
						foreignTables = foreignTables.concat(fTables);
					}));
				});
				return Promise.all(remoteSchemaPromises);
			}));
		});
		resolve(Promise.all(remoteServerPromises));
	}).then(function () {
		setCreateTableSql(foreignTables);
		return createForeignTables(localPgClient, foreignTables);
	}).catch(function (err) {
		logger.error(err);
	});
}


module.exports = {
	initForeignTables: initForeignTables
};
