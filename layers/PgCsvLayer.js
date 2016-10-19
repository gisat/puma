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
    import(request) {
        var files = request.files.file;
        files = this.parseUploadedFiles(files);
        return new Promise(function (result, error) {
            for (var file of files) {
                if (file.type != "text/csv") {
                    continue;
                }
                var csvLines = [];
                fs.createReadStream(file.path).pipe(csv({separator: ';'})).on('data', function (data) {
                    csvLines.push(data);
                }).on('end', function () {
                    var keys = Object.keys(csvLines[0]);
                    for (var csvLine of csvLines) {
                        for (var key of keys) {
                            data.push(csvLines[0][key]);
                        }
                    }
                    result({data: {data: data}});
                });
            }
        });
    }

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