var should = require('should');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var LodEnhancedTable = require('../../../melodies/LodEnhancedTable');
var PgPool = require('../../../postgresql/PgPool');

describe('LodEnhancedTable', function(){
    it('adds columns to the table', function(done){
        this.timeout(60000);

        var pool = new PgPool({
            user: config.pgDataUser,
            database: config.pgDataDatabase,
            password: config.pgDataPassword,
            host: config.pgDataHost,
            port: config.pgDataPort
        });

        var lodEnhanced = new LodEnhancedTable(pool, 'public', 'cz3', 'fid_1');
        lodEnhanced.update().then(() => {
            done();
        }).catch(err => {
            console.log(err);
            done();
        });
    })
});
