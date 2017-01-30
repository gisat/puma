var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

class PgBaseLayerTables {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }

    update(layerReferenceId, fidColumn, geometryColumn, sourceTableName) {
        return this.remove(layerReferenceId).then(() => {
            return this.add(layerReferenceId, fidColumn, geometryColumn, sourceTableName);
        })
    }

    updateCascade(layerReferenceId, fidColumn, geometryColumn, sourceTableName) {
        return this.removeCascade(layerReferenceId).then(() => {
            return this.add(layerReferenceId, fidColumn, geometryColumn, sourceTableName);
        })
    }

    removeCascade(layerReferenceId) {
        if(!layerReferenceId) {
            throw new Error(
                logger.error(`PgBaseLayerTables#remove layerReferenceId: ${layerReferenceId}`)
            );
        }

        var schema = config.viewsSchema;
        return this._pgPool.pool().query(`DROP TABLE ${schema}.${PgBaseLayerTables.name(layerReferenceId)} CASCADE`);
    }

    remove(layerReferenceId) {
        if(!layerReferenceId) {
            throw new Error(
                logger.error(`PgBaseLayerTables#remove layerReferenceId: ${layerReferenceId}`)
            );
        }

        var schema = config.viewsSchema;
        return this._pgPool.pool().query(`DROP TABLE ${schema}.${PgBaseLayerTables.name(layerReferenceId)}`);
    }

    add(layerReferenceId, fidColumn, geometryColumn, sourceTableName) {
        if(!layerReferenceId || !fidColumn || !geometryColumn || !sourceTableName) {
            throw new Error(
                logger.error(`PgBaseLayerTables#add layerReferenceId: ${layerReferenceId} fidColumn: ${fidColumn} geometryColumn: ${geometryColumn} sourceTableName: ${sourceTableName}`)
            );
        }

        var schema = config.viewsSchema;

        // TODO: Find a way in Sql to do the transformation only once.
        var sql = `CREATE TABLE ${schema}.${PgBaseLayerTables.name(layerReferenceId)} AS ( 
            SELECT ${fidColumn} as gid,
            ST_Centroid(ST_Transform(${geometryColumn}, 4326)) AS centroid,
            ST_Area(ST_Transform(${geometryColumn}, 4326)::geography) AS area,
            ST_Length(ST_Transform(${geometryColumn}, 4326)) as length,
            Box2D(ST_Transform(${geometryColumn}, 4326)) AS extent
            FROM ${sourceTableName}
        )`;

        return this._pgPool.pool().query(sql);
    }

    static name(layerReferenceId) {
        return `base_${layerReferenceId}`;
    }
}

module.exports = PgBaseLayerTables;