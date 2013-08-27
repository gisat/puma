
var querystring = require('querystring');
var async = require('async');
var conn = require('../common/conn')

function recreateLayerDb(layerRef,isUpdate,callback) {
    
    var crud = require('../rest/crud');
    if (layerRef.toBeDeleted) {
        console.log('removing');
        return removeLayerDbInternal(layerRef,callback);
    }
    async.waterfall([
        
        //nacitani base layer ref
        function(asyncCallback) {
            if (!layerRef.isData) {
                return asyncCallback(null,layerRef);
            }
            crud.read('layerref', {'active':{$ne:false},'areaTemplate':layerRef.areaTemplate, location: layerRef.location, isData:false,year:layerRef.year}, function(err,results) {
                if (err) return asyncCallback(err);
                var result = null;
                for (var i=0;i<results.length;i++) {
                    if (results[i].fidColumn) {
                        result = results[i];
                        break;
                    }
                }
                if (!result) {
                    return asyncCallback(new Error('noareatemplateref'));
                }
                return asyncCallback(null,result)
            })
        },
        // zjisteni navaznych layer ref
        function(baseLayerRef,asyncCallback) {
            crud.read('layerref', {'active':{$ne:false},areaTemplate: layerRef.areaTemplate, year: layerRef.year, location: layerRef.location, isData:true}, function(err,results) {
                if (err) return asyncCallback(err);
                return asyncCallback(null,baseLayerRef,results)
            })
        }
    ],
        function(err,baseLayerRef,layerRefs) {
            if (err) return callback(err);
            return recreateLayerDbInternal(baseLayerRef,layerRefs,layerRef.isData ? false : true,isUpdate,callback);
        } 
    )
}

var removeLayerDbInternal = function(areaLayerRef,callback) {
    var viewName ='views.layer_'+areaLayerRef['_id'];
    var tableName = 'views.base_'+areaLayerRef['_id'];
    var sql = 'DROP VIEW IF EXISTS '+viewName+';';
    sql += 'DROP TABLE IF EXISTS '+tableName+';'
    var client = conn.getPgDb();
    client.query(sql,function(err,results) {
        if (err) return callback(err);
        callback(null);
    })
}

function checkUniqueId(layerRef,callback) {
    // overeni jedinecnosti ID
    var from = layerRef.layer.split(':')[0] == 'geonode' ? layerRef.layer.split(':')[1] : (layerRef.layer.split(':')[0]+'.'+layerRef.layer.split(':')[1])
    var fromWithoutSchema = layerRef.layer.split(':')[1]
    
    var sql = 'ALTER TABLE '+from+' DROP CONSTRAINT IF EXISTS '+fromWithoutSchema+'_unique;'
    sql += 'ALTER TABLE '+from+' ADD CONSTRAINT '+fromWithoutSchema+'_unique UNIQUE("'+layerRef.fidColumn+'");'
    var client = conn.getPgDb();
    console.log(sql)
    client.query(sql,function(err) {
        if (err) return callback(new Error('IDs not unique'));
        
        callback(null);
    })
}

var recreateLayerDbInternal = function(areaLayerRef,dataLayerRefs,isBase,isUpdate,callback) {
    var layerName =' views.layer_'+areaLayerRef['_id'];
    var from = areaLayerRef.layer.split(':')[0] == 'geonode' ? areaLayerRef.layer.split(':')[1] : (areaLayerRef.layer.split(':')[0]+'.'+areaLayerRef.layer.split(':')[1])
    console.log(isBase)
    // priprava view
    var sql = 'BEGIN; DROP VIEW IF EXISTS '+layerName+'; ';
    if (isBase && !isUpdate) {
        var viewName = 'base_'+areaLayerRef['_id'];
        sql += 'CREATE TABLE views.'+viewName+' AS (SELECT ';
        sql += '"'+areaLayerRef.fidColumn+'" AS gid,';
        sql += 'ST_Centroid(ST_Transform(the_geom,4326)) as centroid,';
        sql += 'ST_Area(ST_Transform(the_geom,4326)::geography) as area,';
        sql += 'ST_Length(ST_Transform(the_geom,4326)::geography) as length,';
        sql += 'ST_Box2D(ST_Transform(the_geom,4326)) as extent FROM '+areaLayerRef.layer.split(':')[1]+');';
        sql += 'ALTER TABLE views.'+viewName+' ADD CONSTRAINT '+viewName+'_unique UNIQUE(gid);'
    }
    
    sql += 'CREATE VIEW '+layerName+' AS SELECT ';
    // select z uzemni vrstvy
    sql += 'a."'+areaLayerRef.fidColumn+'" AS gid,';
    sql += 'a."'+(areaLayerRef.nameColumn || areaLayerRef.fidColumn) + (areaLayerRef.nameColumn ? '"' : '"::VARCHAR') +' AS name,';
    sql += areaLayerRef.parentColumn ? ('a."'+areaLayerRef.parentColumn+'" AS parentgid,') : 'NULL::integer AS parentgid,';
    sql += 'a.the_geom,';
    sql += 'b.area,';
    sql += 'b.length,';
    sql += 'b.centroid,';
    sql += 'b.extent';
    var attrSql = '';
    var layerMap = {};
    
    // select z pripojenych vrstev
    var existingAliases = {};
    for (var i = 0; i < dataLayerRefs.length; i++) {
        var layerRef = dataLayerRefs[i];
        var layerAlias = 'l_'+layerRef['_id'];
        if (!layerRef.attributeSet) continue;
        var name = layerRef.layer.split(':')[0] == 'geonode' ? layerRef.layer.split(':')[1] : (layerRef.layer.split(':')[0]+'.'+layerRef.layer.split(':')[1])
        layerMap[layerAlias] = {name:name, fid:layerRef.fidColumn};
        for (var j = 0; j < layerRef.columnMap.length; j++) {
            var attrRow = layerRef.columnMap[j];
            var alias = 'as_'+layerRef.attributeSet+'_attr_'+attrRow.attribute;
            var column = layerAlias+'."'+attrRow.column+'"';
            if (existingAliases[alias]) {
                continue;
            }
            existingAliases[alias] = true;
            attrSql += attrSql ? ',' : '';
            attrSql += column + ' AS ' + alias;
        }
    }
    sql += attrSql ? ',' : '';
    sql += attrSql;
    
    sql += ' FROM '+from+' a';
    sql += ' LEFT JOIN views.base_'+areaLayerRef['_id']+' b ON a."'+areaLayerRef.fidColumn+'"=b."gid"';
    // join pripojenych vrstev
    for (var key in layerMap) {
        sql += ' LEFT JOIN '+layerMap[key].name+' '+key+' ON ';
        sql += 'a."' + areaLayerRef.fidColumn+'"='+key+'."'+layerMap[key].fid+'"::bigint';
    }

    sql += '; COMMIT;'; 
    var client = conn.getPgDb();
    client.query(sql,function(err,results) {
        if (err) return callback(err);
        callback(null,areaLayerRef);
    })
        
}

function changeLayerGeoserver(layerId, method, callback) {
    var username = 'tomasl84';
    var password = 'lou840102';
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var headers = {
        'Content-type': 'application/json',
        'Authorization': auth
    };
    var name = 'layer_' + layerId;

    var path = method != 'DELETE' ? '/geoserver_i2/rest/workspaces/puma/datastores/views/featuretypes' : '/geoserver_i2/rest/layers'
    var data = null;

    if (method == 'POST') {
        path += '.json';
    }
    else {
        path += '/' + name;
    }
    if (method != 'DELETE') {
        var obj = {
            featureType: {
                name: name,
                nativeName: name,
                title: name,
                enabled: true
            }}
        data = JSON.stringify(obj);
    }

    console.log(method)

    var options = {
        host: conn.getBaseServer(),
        path: path,
        headers: headers,
        port: conn.getPort(),
        method: method
    };
    conn.request(options, data, function(err, output, resl) {
        if (err)
            return callback(err);
        console.log(output)
        return callback();
    })

}


module.exports = {
    recreateLayerDb: recreateLayerDb,
    checkUniqueId: checkUniqueId,
    changeLayerGeoserver: changeLayerGeoserver
}
