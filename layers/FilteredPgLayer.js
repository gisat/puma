var path = require('path');
var Promise = require('promise');
var util = require('util');
var child_process  = require('pn/child_process');
var logger = require('../common/Logger').applicationWideLogger;

var UUID = require('../common/UUID');
var config = require('../config');

class FilteredPgLayer {
    constructor(layer, gids) {
        this._layer = layer;
        this._gids = gids;
        this._uuid = new UUID().toString();
    }

    export() {
        var path;
        var self = this;
        return this.path().then(function(pathReturned){
            path = pathReturned;
            return self.sql();
        }).then(function(sql){
            console.log(sql);
            return child_process.execFile('pgsql2shp', ["-f " + path, "-h " + config.pgDataHost, '-u ' + config.pgDataUser, '-P ' + config.pgDataPassword, config.pgDataDatabase, '"' + sql + '"']).promise;
        }).then(function(){
            return child_process.execFile('zip', [path, path + ".*"]);
        }).then(function(){
            return path + '.zip';
        }).catch(function(err){
            throw new Error(
                logger.error('FilteredPgLayer#export Not possible to export Error: ', err)
            );
        });
    }

    sql() {
        // TODO: Make sure there is no issue with SQL Injection
        var self = this;
        return this._layer.id().then(function(id){
            return util.format("select * from %s.layer_%s where gid in (%s)", config.postgreSqlSchemaLayers, id, "'" + self._gids.join("','") + "'");
        });
    }

    path() {
        var finalPath = path.resolve(config.exportDirectory + this._uuid);
        return Promise.resolve(finalPath);
    }
}

module.exports = FilteredPgLayer;