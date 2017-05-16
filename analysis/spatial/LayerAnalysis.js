let _ = require('lodash');

class LayerAnalysis {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }
    
    /**
     * Perform layer analysis
     * @param layer
     * @param analyticalUnit
     * @param outputAnalysisTable
     * @param analysis
     */
    analyseLayer(layer, analyticalUnit, outputAnalysisTable, analysis) {
        return Promise.resolve().then(() => {
            let analyticalUnitTableName = analyticalUnit.layer.split(`:`)[1];
            let layerTableName = layer.systemName;
            let analyticalUnitFid = analyticalUnit.fidColumn;
            
            return Promise.all([
                this.getGeometryColumnForTable(layerTableName, (layer.type === 'raster')),
                this.getGeometryColumnForTable(analyticalUnitTableName)
            ]).then((geometryColumns) => {
                let layerGeometryColumn = geometryColumns[0];
                let analyticalUnitGeometryColumn = geometryColumns[1];
                let sqlQuery;
                
                if (layer.type === "raster") {
                    let attributes = _.map(analysis, analysis => {
                        return `${analysis.type}((foo.pvc).count) AS ${analysis.attribute}`;
                    });
                    
                    sqlQuery = `DROP TABLE IF EXISTS analysis."${outputAnalysisTable}" CASCADE;
                                                CREATE TABLE analysis."${outputAnalysisTable}" AS (
                                                    SELECT
                                                        foo."${analyticalUnitFid}"              AS gid,
                                                        ${attributes.join(`, `)}
                                                    FROM (SELECT
                                                            st_valuecount(st_clip(l."${layerGeometryColumn}", st_transform(g."${analyticalUnitGeometryColumn}", st_srid(l."${layerGeometryColumn}")))) AS pvc,
                                                            g."${analyticalUnitFid}"
                                                          FROM
                                                            public."${layerTableName}" AS l INNER JOIN public."${analyticalUnitTableName}" AS g
                                                          ON st_intersects(l."${layerGeometryColumn}", st_transform(g."${analyticalUnitGeometryColumn}", st_srid(l."${layerGeometryColumn}")))) AS foo
                                                    GROUP BY foo."${analyticalUnitFid}"
                                                    ORDER BY "${analyticalUnitFid}");`;
                } else if (layer.type === "vector") {
                    let attributes = _.map(analysis, analysis => {
                        return `round(${analysis.type}(l."${analysis.column}" / 100 *
                                                               (st_area(st_intersection(l."${analyticalUnitGeometryColumn}", st_transform(g."${analyticalUnitGeometryColumn}", st_srid(l."${layerGeometryColumn}")))) /
                                                                st_area(l."${layerGeometryColumn}") *
                                                                100))) AS ${analysis.attribute}`;
                    });
                    
                    sqlQuery = `DROP TABLE IF EXISTS analysis."${outputAnalysisTable}" CASCADE;
                                                CREATE TABLE analysis."${outputAnalysisTable}" AS (
                                                SELECT
                                                    g."${analyticalUnitFid}"              AS gid,
                                                    ${attributes}
                                                FROM public."${layerTableName}" AS l INNER JOIN public."${analyticalUnitTableName}" AS g
                                                    ON st_intersects(l."${layerGeometryColumn}", st_transform(g."${analyticalUnitGeometryColumn}", st_srid(l."${layerGeometryColumn}")))
                                                GROUP BY g."${analyticalUnitFid}");`
                }
                return this._pgPool.pool().query(sqlQuery);
            });
        });
    }
    
    /**
     * Get geometry colum for given table
     * @param tableName
     * @param isRaster
     */
    getGeometryColumnForTable(tableName, isRaster) {
        let sql = `SELECT
                                f_geometry_column AS column_name
                           FROM
                                geometry_columns
                           WHERE
                                f_table_name='${tableName}';`;
        
        if (isRaster) {
            sql = `SELECT
                                column_name
                           FROM
                                information_schema.columns
                           WHERE
                                table_name = '${tableName}'
                                AND column_name = 'rast';`
        }
        
        return this._pgPool
            .pool()
            .query(sql)
            .then((results) => {
                if (!results.rows.length) throw new Error(`there is no geometry column for given table`);
                return results.rows[0][`column_name`];
            });
    }
}

module.exports = LayerAnalysis;