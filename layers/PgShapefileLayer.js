var path = require('path');
var Promise = require('promise');
var util = require('util');
var child_process  = require('pn/child_process');
var logger = require('../common/Logger').applicationWideLogger;

var UUID = require('../common/UUID');
var config = require('../config');

class PgShapefileLayer {
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
            console.log(sql, path);
            let host = config.pgDataHostRemote || config.pgDataHost;
            let user = config.pgDataUserRemote || config.pgDataUser;
            let password = config.pgDataPasswordRemote || config.pgDataPassword;
            let database = config.pgDataDatabaseRemote || config.pgDataDatabase;
            return child_process.exec(`pgsql2shp -f ${path} -h ${host} -u ${user} -P ${password} ${database} "${sql}"`).promise;
        }).then(function(results){
            console.log(results.stdout);
            console.log(results.stderr);
            return child_process.exec('zip -j ' + path + ' ' + path + '.*').promise;
        }).then(function(){
            return path + '.zip';
        }).catch(function(err){
            throw new Error(
                logger.error('PgShapefileLayer#export Not possible to export Error: ', err)
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

module.exports = PgShapefileLayer;