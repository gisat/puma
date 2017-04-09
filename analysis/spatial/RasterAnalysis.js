let _ = require('lodash');

class RasterAnalysis {
    constructor(pgPool) {
        this._pgPool = pgPool;
    }
    
    analyse(rasterLayer, geometryLayer, geomColumn, fidColumn, analysisTableName, analysis) {
        let attributes = _.map(analysis, analysis => {
            switch (analysis.type) {
                case "sum":
                    return `sum((foo.pvc).count) AS ${analysis.attribute}`;
                case "avg":
                    return `avg((foo.pvc).count) AS ${analysis.attribute}`;
                default:
                    return `sum((foo.pvc).count) AS ${analysis.attribute}`;
            }
        });
        let sqlQuery = `
                DROP TABLE IF EXISTS analysis.${analysisTableName} CASCADE;
                CREATE TABLE analysis.${analysisTableName} AS (
                    SELECT
                        foo."${fidColumn}"              AS gid,
                        ${attributes.join(`, `)}
                    FROM (SELECT
                            st_valuecount(st_clip(r.rast, st_transform(g."${geomColumn}", st_srid(r.rast)))) AS pvc,
                            g."${fidColumn}"
                          FROM
                            public."${rasterLayer}" AS r INNER JOIN public."${geometryLayer}" AS g
                          ON st_intersects(r.rast, st_transform(g."${geomColumn}", st_srid(r.rast)))) AS foo
                    GROUP BY foo."${fidColumn}"
                    ORDER BY "${fidColumn}");
            `;
        return this._pgPool.pool().query(sqlQuery);
    }
}

module.exports = RasterAnalysis;