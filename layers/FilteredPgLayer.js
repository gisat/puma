var path = require(path);
var Promise = require('promise');
var util = require('util');
var child_process  = require('pn/child_process');

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
        return this.path().then(function(pathReturned){
            path = pathReturned;
            return this.sql();
        }).then(function(sql){
            return child_process.execFile('pgsql2shp', ["-f " + path, " -h " + config.pgDataHost, ' -u ' + config.pgDataUser, ' -P ' + config.pgDataPassword, config.pgDataDatabase, sql]).promise;
        }).then(function(){
            return child_process.execFile('zip', [path, path + ".*"]);
        }).then(function(){
            return path + '.zip';
        });
    }

    sql() {
        // TODO: Make sure there is no issue with SQL Injection
        var self = this;
        return this._layer.id().then(function(id){
            return util.format("select * from %s.layers_%s where gid in (%s)", config.postgreSqlSchemaLayers, id, self._gids.toString());
        });
    }

    path() {
        var finalPath = path.resolve(config.exportDirectory + this._uuid);
        return Promise.resolve(finalPath);
    }
}

module.exports = FilteredPgLayer;