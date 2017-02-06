let should = require('should');

let PgPermissions = require('../../../security/PgPermissions');

describe('PgPermissions', () => {
    describe('#forUserSql', () => {
        it('creates valid sql returning user permissions', () => {
            let pgPermissions = new PgPermissions({pool: function(){}}, 'test');

            let result = pgPermissions.forUserSql(10);
            should(result).be.exactly(`SELECT * FROM test.permissions WHERE user_id = 10`);
        });
    });

    describe('#addSql', () => {
        it('creates valid sql adding the new permission', () => {
            let pgPermissions = new PgPermissions({pool: function(){}}, 'test');

            let result = pgPermissions.addSql(10, 'scope', 5, 'PUT');
            should(result).be.exactly(`INSERT INTO test.permissions (user_id, resource_type, resource_id, permission) VALUES (10, 'scope', '5', 'PUT')`);
        });
    });

    describe('#removeSql', () => {
        it('creates valid sql removing permission', () => {
            let pgPermissions = new PgPermissions({pool: function(){}}, 'test');

            let result = pgPermissions.removeSql(10, 'scope', 5, 'PUT');
            should(result).be.exactly(`DELETE FROM test.permissions WHERE user_id = 10 AND resource_type = 'scope'  AND resource_id = '5'  AND permission = 'PUT'`);
        })
    });

    describe('#transformRowsToPermissions', ()=>{
        it('returns empty array for no record', () => {
            let pgPermissions = new PgPermissions({pool: function(){}}, 'test');

            let result = pgPermissions.transformFromRowsToPermissions({rows: []});
            should(result).deepEqual([]);
        });

        it('returns transformed array', () => {
            let pgPermissions = new PgPermissions({pool: function(){}}, 'test');

            let result = pgPermissions.transformFromRowsToPermissions({rows: [{
                resource_type: 'scope',
                resource_id: 10,
                permission: 'PUT'
            }, {
                resource_type: 'place',
                resource_id: 5,
                permission: 'GET'
            }]});
            should(result).deepEqual([{
                resourceType: 'scope',
                resourceId: 10,
                permission: 'PUT',
                id: null
            },{
                resourceType: 'place',
                resourceId: 5,
                permission: 'GET',
                id: null
            }]);
        })
    })
});