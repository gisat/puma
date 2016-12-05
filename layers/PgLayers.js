var Promise = require('promise');

// Take existing layer based on base layer id
// Add new attributes to the source table.
//   Download data from the LOD sources per row of existing table
//   Load rows from the source table for the geometry in each row get the results.
//   Add result to the given row under some name
// Modify layerref by adding new attribute into columnMap
// Recreate view for this layer.


class PgLayers {
    constructor(pgPool) {
        this.pgPool = pgPool;
    }

    all() {
        // It returns names of all views representing layers in the PostgreSql.
        return this.pgPool.query("select table_name from INFORMATION_SCHEMA.views WHERE table_schema ILIKE 'layer_%'");
    }

    add(attributeSets, attributes, id, mapping) {
        // BaseTable
        // View
    }
}

module.exports = PgLayers;