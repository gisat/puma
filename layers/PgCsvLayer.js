var PgShapeFileLayer = require('./PgShapefileLayer');
var util = require('util');
var config = require('../config');
var child_process = require('pn/child_process');
var Promise = require('promise');
var fs = require('fs');
var csv = require('csv-parser');
var superagent = require('superagent');
var _ = require('lodash');

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

            var command = util.format('psql -U %s %s -c "COPY(%s) TO \'%s\' WITH CSV DELIMITER\',\' HEADER"', config.pgDataUser, config.pgDataDatabase, sql, path);
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
        let files = request.files.file;
        files = this.parseUploadedFiles(files);
        return new Promise(function (result, error) {
            for (let file of files) {
                if (file.type == "text/csv") {
                    let csvLines = [];

                    fs.createReadStream(file.path).pipe(csv({separator: ','})).on('data', function (data) {
                        csvLines.push(data);
                    }).on('end', function () {
                        let tableName = file.name.replace(/\W+/g, "_").toLowerCase();
                        let keys = Object.keys(csvLines[0]);
                        let checkExistingTable = `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${tableName}');`;

                        pgPool.pool().query(checkExistingTable).then(queryResult => {
                            if (!queryResult.rows[0].exists) {
                                let columns = "";
                                for (let key of keys) {
                                    columns += `"${key}" double precision, `;
                                }
                                let createTable = `CREATE TABLE ${tableName} (_id serial primary key, ${columns.slice(0, -2)}, the_geom geometry);`;

                                pgPool.pool().query(createTable).then(queryResult => {
                                    let correctKeys = _.map(keys, key => {
                                        return `"${key}"`;
                                    });
                                    let csvToPsql = `INSERT INTO ${tableName} (${correctKeys.slice()}, the_geom) VALUES `;
                                    for (let csvLine of csvLines) {
                                        let values = [];
                                        for (let key of keys) {
                                            values.push(csvLine[key]);
                                        }
                                        csvToPsql += `(${values.slice()}, ST_SetSRID(ST_MakePoint(${csvLine.LON}, ${csvLine.LAT}), 4326)), `;
                                    }
                                    csvToPsql = csvToPsql.slice(0, -2);
                                    pgPool.pool().query(csvToPsql).then(queryResult => {
                                        superagent
                                            .get(`http://localhost/cgi-bin/publishlayer?l=${tableName}&d=datastore&p=EPSG:4326`)
                                            .end(function (error, response) {
                                                if (error) {
                                                    result({
                                                        message: `I was not able to publish layer ${tableName}`,
                                                        error: error,
                                                        success: false
                                                    });
                                                }
                                                superagent
                                                    .get(`http://localhost/cgi-bin/updatelayers?f=${tableName}`)
                                                    .end(function (error, response) {
                                                        if (error) {
                                                            result({
                                                                message: `I was not able to publish layer ${tableName}`,
                                                                error: error,
                                                                success: false
                                                            });
                                                        }
                                                        result({
                                                            message: `I just publish layer ${tableName}`,
                                                            success: true
                                                        });
                                                    });
                                            });
                                    }).catch(error => {
                                        pgPool.pool().query(`DROP TABLE ${tableName}`);
                                        result({
                                            message: `I was not able to insert data into ${tableName} table!\n${csvToPsql.substring(0, 1024)}`,
                                            error: error,
                                            success: false
                                        });
                                    });
                                }).catch(error => {
                                    result({
                                        message: `I was not able to create table ${tableName}!`,
                                        error: error,
                                        success: false
                                    });
                                });
                            } else {
                                result({message: `PostgreSQL: Table ${tableName} aready exists!`, success: false});
                            }
                        }).catch(error => {
                            result({
                                message: `I was not able to check if table ${tableName} exists!`,
                                error: error,
                                success: false
                            });
                        });
                    });
                } else {
                    result({message: `I was not able to handle ${file.type} files!`, success: false});
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
        let parsedFiles = [];
        if (files != undefined) {
            if (files.length == undefined) {
                parsedFiles.push({
                    name: files.name,
                    path: files.path,
                    size: files.size,
                    type: files.type
                })
            } else {
                for (let file of files) {
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