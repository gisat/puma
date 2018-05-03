let logger = require('../common/Logger').applicationWideLogger;
let Migration = require('./Migration');

let FilteredMongoPeriods = require('../metadata/FilteredMongoPeriods');
let FilteredMongoTopics = require('../metadata/FilteredMongoTopics');
let FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
let FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');

/**
 * It updates current structure and migrates current metadata to the new PostgreSQL based data structure.
 * @augments Migration
 */
class StoreMetadataInPostgreSQL extends Migration {
    constructor(schema) {
        super('StoreMetadataInPostgreSQL', schema);
    }

    /**
     * It loads all the metadata from the mongo and stores them in the new data structures in the PostgreSQL.
     * @inheritDoc
     */
    process(mongo, pool) {
        // TODO: ADD Constraint for foreign key
        return pool.query(`
            BEGIN TRANSACTION;
            
            ALTER TABLE ${this.schema}.wms_layers ADD COLUMN layer_group INTEGER ;
                 
        `).then(() => {
            return new FilteredMongoPeriods({}, mongo).json();
        }).then(periods => {
            let sql = periods.map(period => `INSERT INTO ${this.schema}.period (id, name) VALUES (${period._id}, '${period.name}'});`);
            logger.info(`StoreMetadataInPostgreSQL#process Insert periods in Postgres SQL: ${sql}`);
            return pool.query(sql);
        }).then(() => {
            return new FilteredMongoAttributes({}, mongo).json();
        }).then(attributes => {
            let sql = attributes.map(attribute => {
                let units = attribute.standardUnits || attribute.units;
                return `INSERT INTO ${this.schema}.topic (id, name, type, units) VALUES 
                        (${attribute._id}, '${attribute.name}', '${attribute.type}', '${units}'});`;
            });
            logger.info(`StoreMetadataInPostgreSQL#process Insert attributes in Postgres SQL: ${sql}`);
            return pool.query(sql);
        }).then(() => {
            return new FilteredMongoAttributeSets({}, mongo).json();
        }).then(attributeSets => {


        }).then(() => {
            let sql = `
                DROP TABLE ${this.schema}.wms_layer_has_periods;
                DROP TABLE ${this.schema}.wms_layer_has_places;
                
                ALTER TABLE ${this.schema}.group_permissions ADD CONSTRAINT fk_group_permissions_id FOREIGN KEY (group_id) REFERENCES ${this.schema}.groups(id);
                ALTER TABLE ${this.schema}.permissions ADD CONSTRAINT fk_permissions_user_id FOREIGN KEY (user_id) REFERENCES ${this.schema}.panther_users(id);
                ALTER TABLE ${this.schema}.group_has_members ADD CONSTRAINT fk_ghm_group FOREIGN KEY (group_id) REFERENCES ${this.schema}.groups(id);
                ALTER TABLE ${this.schema}.group_has_members ADD CONSTRAINT fk_ghm_user FOREIGN KEY (user_id) REFERENCES ${this.schema}.panther_users(id);
                
                ALTER TABLE ${this.schema}.panther_users
                  ADD CONSTRAINT unique_email UNIQUE (email);
                ALTER TABLE ${this.schema}.invitation
                  ADD CONSTRAINT fk_inv_email FOREIGN KEY (email) REFERENCES ${this.schema}.panther_users (email);
                ALTER TABLE ${this.schema}.audit
                  rename column userid to user_id;
                ALTER TABLE ${this.schema}.audit
                  ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES ${this.schema}.panther_users (id);

                ALTER TABLE ${this.schema}.wms_layer DROP COLUMN created;
                ALTER TABLE ${this.schema}.wms_layer DROP COLUMN created_by;
                ALTER TABLE ${this.schema}.wms_layer DROP COLUMN changed;
                ALTER TABLE ${this.schema}.wms_layer DROP COLUMN changed_by;
                
                ALTER TABLE ${this.schema}.group_has_members DROP COLUMN created;
                ALTER TABLE ${this.schema}.group_has_members DROP COLUMN created_by;
                ALTER TABLE ${this.schema}.group_has_members DROP COLUMN changed;
                ALTER TABLE ${this.schema}.group_has_members DROP COLUMN changed_by;
                
                ALTER TABLE ${this.schema}.groups DROP COLUMN created;
                ALTER TABLE ${this.schema}.groups DROP COLUMN created_by;
                ALTER TABLE ${this.schema}.groups DROP COLUMN changed;
                ALTER TABLE ${this.schema}.groups DROP COLUMN changed_by;
                
                ALTER TABLE ${this.schema}.panther_users DROP COLUMN created;
                ALTER TABLE ${this.schema}.panther_users DROP COLUMN created_by;
                ALTER TABLE ${this.schema}.panther_users DROP COLUMN changed;
                ALTER TABLE ${this.schema}.panther_users DROP COLUMN changed_by;            
            `;
            return pool.query(sql);
        });
    }
}

module.exports = StoreMetadataInPostgreSQL;