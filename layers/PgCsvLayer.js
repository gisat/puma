var PgShapeFileLayer = require('./PgShapefileLayer');
var util = require('util');
var config = require('../config');
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
        return this._shpLayer.path().then(function(pathReturned){
            path = pathReturned + '.csv';
            return self._shpLayer.sql();
        }).then(function(sql){
            console.log(sql, path);

            var command = util.format('psql -U %s %s -c "COPY(%s) TO %s WITH CSV DELIMITER\',\'"', config.pgDataUser, config.pgDataDatabase, sql, path);
            return child_process.exec(command).promise;
        }).then(function(results){
            console.log(results.stdout);
            console.log(results.stderr);
            return path;
        }).catch(function(err){
            throw new Error(
                logger.error('PgCsvLayer#export Not possible to export Error: ', err)
            );
        });
    }
}

module.exports = PgCsvLayer;