var PgShapeFileLayer = require('./PgShapefileLayer');
var util = require('util');
var config = require('../config');
var child_process = require('pn/child_process');
var Promise = require('promise');
var fs = require('fs');
var csv = require('csv-parser');

var logger = require('../common/Logger').applicationWideLogger;

class PgCsvLayer {
    constructor(layer, gids) {
        this._layer = layer;
        this._gids = gids;
        this._shpLayer = new PgShapeFileLayer(layer, gids);
    }

    export() {
        var path;
        var self = this;
        return this._shpLayer.path().then(function (pathReturned) {
            path = pathReturned + '.csv';
            return self._shpLayer.sql();
        }).then(function (sql) {
            console.log(sql, path);

            var command = util.format('psql -U %s %s -c "COPY(%s) TO \'%s\' WITH CSV DELIMITER\',\'"', config.pgDataUser, config.pgDataDatabase, sql, path);
            return child_process.exec(command).promise;
        }).then(function (results) {
            console.log(results.stdout);
            console.log(results.stderr);
            return path;
        }).catch(function (err) {
            throw new Error(
                logger.error('PgCsvLayer#export Not possible to export Error: ', err)
            );
        });
    }

    /**
     * Import csv file into PostgreSQL database
     * @param request Post request
     * @returns JSON object with informations about imported layers
     */
    import(request, pgPool) {
        var data = [];
        var files = request.files.file;
        files = this.parseUploadedFiles(files);
        return new Promise(function (result, error) {
            for (var file of files) {
                if (file.type == "text/csv") {
                    var csvLines = [];
                    fs.createReadStream(file.path).pipe(csv({separator: ','})).on('data', function (data) {
                        csvLines.push(data);
                    }).on('end', function () {
                        var tableName = file.name.replace(/\W+/g, "_").toLowerCase();
                        var keys = Object.keys(csvLines[0]);
                        var checkExistingTable = `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${tableName}');`;
                        pgPool.pool().query(checkExistingTable).then(queryResult => {
                            if (!queryResult.rows[0].exists) {
                                var columns = "";
                                for (var key of keys) {
                                    columns += `${key} double precision, `;
                                }
                                var createTable = `CREATE TABLE ${tableName} (${columns.slice(0, -2)});`;

                                pgPool.pool().query(createTable).then(queryResult => {
                                    var copyCsvToPsql = `COPY ${tableName} FROM '${file.path}' DELIMITER ',' CSV;`;
                                    console.log(copyCsvToPsql);
                                    pgPool.pool().query(copyCsvToPsql).then(queryResult => {
                                        console.log(queryResult);
                                    }).catch(error => {
                                        result({data: {error: error}});
                                    });
                                }).catch(error => {
                                    result({data: {error: error}});
                                });
                            } else {
                                data.push({name: tableName, exists: queryResult.rows[0].exists});
                                result({data: {data: data}});
                            }
                        }).catch(error => {
                            result({data: {error: error}});
                        });
                    });
                }
            }
        });
    }

    /**
     * Parse relevant data of uploaded files
     * @param files List or object with metadata of uploaded file/s
     * @returns {Array} List of uploaded files
     */
    parseUploadedFiles(files) {
        var parsedFiles = [];
        if (files != undefined) {
            if (files.length == undefined) {
                parsedFiles.push({
                    name: files.name,
                    path: files.path,
                    size: files.size,
                    type: files.type
                })
            } else {
                for (var file of files) {
                    parsedFiles.push({
                        name: file.name,
                        path: file.path,
                        size: file.size,
                        type: file.type
                    })
                }
            }
        }
        return parsedFiles;
    }
}

module.exports = PgCsvLayer;