
var http = require('http');
var querystring = require('querystring');
var conn = require('../common/conn');
var crud = require('../rest/crud');
var dom = require('../common/dom');
var async = require('async');
var OpenLayers = require('openlayers').OpenLayers;
var xmldoc = require('xmldoc');
var us = require('underscore')
var config = require('../config');

var filter = {
    281: [
        {as: 321, attr: 297, normType: 'area', min: 4, max: 5}
    ]
}


function copyYears(params, req, res, callback) {
    var filter = {
        attributeSet: {$in: [328,329,369,370,473,404,1694,450,451,467]},
        year: 277
    }
    crud.read('layerref',filter,function(err,resls) {
        async.forEach(resls,function(item,eachCallback) {
            var obj = us.clone(item);
            delete obj['_id'];
            obj.year = 278;
            crud.create('layerref',obj,{bypassHooks: true,userId: req.userId},eachCallback);
            
        },callback)
    })
}

function gatherLayerData(featureInfo, callback) {
    var confs = [];
    var features = JSON.parse(featureInfo).features;
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var gid = feature.properties.gid;
        var layerName = feature.id.split('.')[0];
        confs.push({layerName: layerName, gid: gid})
    }

    var opts = {
        data: function(asyncCallback) {
            async.map(confs, function(item, eachCallback) {
                var sql = 'SELECT * FROM views.' + item.layerName + ' WHERE gid=' + item.gid;
                //console.log(sql)
                var client = conn.getPgDataDb();
                client.query(sql, [], function(err, resls) {
                    if (err)
                        return callback(err);
                    var row = resls.rows[0];
                    if (!row) {
                        return eachCallback(null, {row: null, attrs: [], attrSets: []})
                    }
                    var attrs = [];
                    var attrSets = [];
                    var dataMap = {};
                    for (var key in row) {
                        if (key.indexOf('attr') < 0) {
                            continue;
                        }
                        var splitted = key.split('_');
                        attrSets.push(parseInt(splitted[1]));
                        attrs.push(parseInt(splitted[3]));
                    }
                    attrSets = us.uniq(attrSets);
                    attrs = us.uniq(attrs);
                    eachCallback(null, {row: row, attrs: attrs, attrSets: attrSets});
                })
            }, function(err, items) {
                var rows = [];
                var attrSets = [];
                var attrs = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    attrSets = us.union(attrSets, item.attrSets)
                    attrs = us.union(attrs, item.attrs);
                    rows.push(item.row);
                }
                return asyncCallback(null, {rows: rows, attrSets: attrSets, attrs: attrs})
            })
        },
        attrSets: ['data',function(asyncCallback, results) {
            crud.read('attributeset', {_id: {$in: results.data.attrSets}}, function(err, resls) {
                if (err)
                    callback(err);
                var attrSetMap = {};
                for (var i = 0; i < resls.length; i++) {
                    var attrSet = resls[i];
                    attrSetMap[attrSet._id] = attrSet;
                }
                asyncCallback(null, attrSetMap)
            })
        }],
        attrs: ['data',function(asyncCallback, results) {
            crud.read('attribute', {_id: {$in: results.data.attrs}}, function(err, resls) {
                if (err)
                    callback(err);
                var attrMap = {};
                for (var i = 0; i < resls.length; i++) {
                    var attr = resls[i];
                    attrMap[attr._id] = attr;
                }
                asyncCallback(null, attrMap)
            })
        }],
        result: ['attrs','attrSets','data',function(asyncCallback, results) {
            var rows = results.data.rows;
            var data = [];
            //console.log(results.data)
            for (var i=0;i<rows.length;i++) {
                var row = rows[i];
                var rowParent = {
                    attrSet: -1,
                    expanded: true,
                    name: row.name,
                    children: []
                }
                var attrSetNode = null;
                for (var key in row) {
                    if (key.indexOf('attr') < 0) {
                        continue;
                    }
                    var splitted = key.split('_');
                    var attrSet = splitted[1];
                    var attr = splitted[3];
                    if (!attrSetNode || attrSetNode.attrSet != attrSet) {
                        attrSetNode = {
                            attrSet: attrSet,
                            expanded: true,
                            name: results.attrSets[attrSet].name,
                            children: []
                        }
                        rowParent.children.push(attrSetNode)
                    }
                    var attrNode = {
                        attrSet: attrSet,
                        name: results.attrs[attr].name,
                        value: row[key],
                        leaf: true
                    }
                    attrSetNode.children.push(attrNode)
                }
                data.push(rowParent)
            }
            return callback(null,data);
        }],
    }
    async.auto(opts)

}



function getLayers(params, req, res, callback) {

    var headers = {
        'Cookie': 'sessionid=' + (req.ssid || '')
    };

    var options = {
        host: conn.getGeonodeHost(),
        path: conn.getGeonodePath()+'/layers/acls',
        headers: headers,
        method: 'GET'
    };

    conn.request(options, null, function(err, output, resl) {
        if (err)
            return callback(err);
        var layers = JSON.parse(output).rw;
        var layerMap = {};
        for (var i = 0; i < layers.length; i++) {
            layerMap[layers[i]] = false;
        }

        crud.read('layerref', {layer: {$in: layers}}, function(err, result) {
            if (err)
                return callback(err);

            for (var i = 0; i < result.length; i++) {
                layerMap[result[i].layer] = true;
            }
            var objs = [];
            for (layer in layerMap) {
                var obj = {
                    name: layer,
                    referenced: layerMap[layer]
                }
                objs.push(obj);
            }
            objs.push({name: 'WMS', referenced: false, isWms: true})
            res.data = objs;
            return callback();
        })

    })
}



function activateLayerRef(params, req, res, callback) {
    var opts = {
        'layerRef': function(asyncCallback) {
            if (params['obj']) {
                return asyncCallback(null, params['obj']);
            }
            crud.read('layerref', {_id: parseInt(params['id'])}, function(err, results) {
                if (err)
                    return callback(err);
                var layerRef = results[0]
                if (!layerRef.fidColumn) {
                    layerRef.active = !layerRef.active;
                }
                else {
                    layerRef.active = true;
                }
                   
                var id = layerRef._id;
                crud.update('layerref', layerRef, {userId: req.userId}, function(err) {
                    if (err)
                        return callback(err);
                    layerRef._id = id;
                    asyncCallback(null, layerRef);
                })
            })
        },
        'identicalLayerRef': ['layerRef', function(asyncCallback, results) {
                var layerRef = results.layerRef;
                var filter = {$and: [
                        {location: layerRef.location},
                        {year: layerRef.year},
                        {areaTemplate: layerRef.areaTemplate},
                        {isData: layerRef.isData},
                    ]}
                if (layerRef.attributeSet) {
                    filter.attributeSet = layerRef.attributeSet
                }
                crud.read('layerref', filter, function(err, resls) {
                    if (err)
                        return callback(err);
                    asyncCallback(null, resls);
                })
            }],
        'finish': ['identicalLayerRef', 'layerRef', function(asyncCallback, results) {
                var activated = false;
                async.forEachSeries(results.identicalLayerRef, function(item, eachCallback) {
                    // nemenit puvodni layerref a taktez nemenit layerrefs jen pro vizualizaci
                    if (item._id == results.layerRef._id || !item.fidColumn) {
                        return eachCallback(null)
                    }
                    if (params.activateAnother && !activated) {
                        item.active = true;
                        activated = true;
                    }
                    else {
                        item.active = false;
                    }

                    crud.update('layerref', item, {userId: req.userId}, function(err) {
                        if (err)
                            return callback(err);
                        eachCallback(null)
                    })
                }, function() {
                    if (params.justPerform) {

                        return callback(null);
                    }
                    return getLayerRefTable(params, req, res, callback);
                })
            }]

    }
    async.auto(opts);
}


function getLayerDetails(params, req, res, callback) {

    var postData = {
        SERVICE: 'wfs',
        REQUEST: 'DescribeFeatureType',
        TYPENAME: params.layer
    };
    postData = querystring.stringify(postData);
    var options = {
        host: conn.getGeoserverHost(),
        port: conn.getGeoserverPort(),
        path: conn.getGeoserverPath()+'/geonode/ows?' + postData,
        method: 'GET'
                ,
        headers: {
            'Cookie': 'ssid=' + req.cookies['ssid']
        }
    };
    conn.request(options, null, function(err, output, resl) {
        if (err)
            return callback(err);
        res.data = output;
        return callback();

    })
}




function getLayerRefTable(params,req,res,callback) {
    var location = parseInt(params['location']);
    var year = parseInt(params['year']);
    var theme = parseInt(params['theme']);
    var opts = {
        theme: function(asyncCallback) {
            crud.read('theme',{_id:theme},{},function(err,resl) {
                if (err) return callback(err);
                return asyncCallback(null,resl[0]);
            })
        },
        dataset: ['theme',function(asyncCallback,results) {
            crud.read('dataset',{_id:results.theme.dataset},{},function(err,resl) {
                if (err) return callback(err);
                return asyncCallback(null,resl[0]);
            })
        }],
        attributeSets: ['dataset','theme',function(asyncCallback,results) {
            crud.read('attributeset',{topic:{$in:results.theme.topics}},{},function(err,resl) {
                if (err) return callback(err);
                //console.log(resl)
                var attrSetMap = {};
                var flMap = {'-1':[]};
                for (var i=0;i<resl.length;i++) {
                    var attrSet = resl[i];
                    attrSetMap[attrSet._id] = attrSet;
                    var featureLayers = attrSet.featureLayers;
                    if (featureLayers && featureLayers.length) {
                        for (var j=0;j<featureLayers.length;j++) {
                            var featureLayer = featureLayers[j];
                            flMap[featureLayer] = flMap[featureLayer] || [];
                            flMap[featureLayer].push(attrSet._id)
                        }     
                    }
                    else {
                        flMap[-1].push(attrSet._id);
                    }
                }
                return asyncCallback(null,{attrSetMap:attrSetMap,flMap:flMap});
            })
        }],
        featureLayerTemplates: ['dataset','theme',function(asyncCallback,results) {
            crud.read('areatemplate',{$or:[{_id:{$in:results.dataset.featureLayers}},{topic:{$in:results.theme.topics}}]},{},function(err,resl) {
                if (err) return callback(err);
                var flMap = {};
                var featureLayers = [];
                var layers = [];
               
                for (var i=0;i<resl.length;i++) {
                    var featureLayer = resl[i];
                    flMap[featureLayer._id] = featureLayer;
                    if (featureLayer.justVisualization) {
                        layers.push(featureLayer._id)
                    }
                    else if (featureLayer.topic) {
                        featureLayers.push(featureLayer._id)
                    }
                }                  
                return asyncCallback(null,{flMap:flMap,featureLayers:featureLayers,layers:layers});
            })
        }],
        res: ['featureLayerTemplates','attributeSets','dataset',function(asyncCallback,results) {
            
            var analyticalUnits = results.dataset.featureLayers;
            var featureLayers = results.featureLayerTemplates.featureLayers;
            var layers = results.featureLayerTemplates.layers;
            var allFeatureLayers = us.union(analyticalUnits,featureLayers,layers)
            var rows = [{value: 'Analytical units'}]
            async.map(allFeatureLayers,function(item,mapCallback) {
                crud.read('layerref',{location:location,year:year,isData:false,areaTemplate:item},{},function(err,resls) {
                    if (err) return callback(err);
                    if (resls.length) {
                        if (analyticalUnits.indexOf(item)>-1) {
                            var attrSets = results.attributeSets.flMap[-1];
                        }
                        else if (featureLayers.indexOf(item)>-1) {
                            var attrSets = results.attributeSets.flMap[item];
                        }
                        else {
                            return mapCallback(null,{geometriesLayerRefs:resls,attrSetLayerRefs:{}})
                        }
                        if (!attrSets || !attrSets.length) {
                            return mapCallback(null,{geometriesLayerRefs:resls,attrSetLayerRefs:{}})
                        }
                        
                        crud.read('layerref',{location:location,year:year,isData:true,areaTemplate:item,attributeSet:{$in:attrSets}},{},function(err2,resls2) {
                            
                            if (err2) return callback(err2);
                            
                            var attrSetMap = {};
                            for (var i=0;i<resls2.length;i++) {
                                var layerRef = resls2[i];
                                var id = layerRef.attributeSet;
                                attrSetMap[id] = attrSetMap[id] || [];
                                attrSetMap[id].push(layerRef)
                            }
                            return mapCallback(null,{geometriesLayerRefs:resls,attrSetLayerRefs:attrSetMap})
                        })
                    }
                    else {
                        return mapCallback(null,{geometriesLayerRefs:resls,attrSetLayerRefs:{}})
                    }
                })
            },
            function(err,result) {
                
                for (var i=0;i<allFeatureLayers.length;i++) {
                    var value = '';
                    var au = allFeatureLayers[i];
                    var layerRefs = result[i].geometriesLayerRefs;
                    var name = results.featureLayerTemplates.flMap[au].name;
                    var hasRef = true
                    for (var j = 0; j < layerRefs.length; j++) {
                        var layerRef = layerRefs[j];
                        var cls = getCls(layerRef)
                        value += '<a href="blank" layerref="' + layerRef['_id'] + '" class="' + cls + '">' + name + '</a> '
                    }
                    if (!layerRefs.length) {
                        hasRef = false;
                        value += '<a href="blank" class="noref">' + name + '</a> '
                    }
                    var attrSetLayerRefs = result[i].attrSetLayerRefs;
                    
                    if (i==analyticalUnits.length) {
                        rows.push({
                            value: 'Vector layers'
                        })
                    }
                    if (i==analyticalUnits.length+featureLayers.length) {
                        rows.push({
                            value: 'Layers'
                        })
                    }
                    
                    
                    if (hasRef && i<analyticalUnits.length) {
                        var attrSets = results.attributeSets.flMap[-1];
                    }
                    else if (hasRef && i>=analyticalUnits.length && i<analyticalUnits.length+featureLayers.length) {
                        var attrSets = results.attributeSets.flMap[au];
                    }
                    else {
                        rows.push({
                            value: value,
                            areaTemplate: au,
                            location: location,
                            year: year
                        })
                        continue;
                    }
                    if (!attrSets) {
                        attrSets = [];
                    }
                    var value2 = '';
                    for (var j = 0; j < attrSets.length; j++) {
                        var attrSet = attrSets[j];
                        var name = results.attributeSets.attrSetMap[attrSet].name;
                        var layerRefs = attrSetLayerRefs[attrSet]
                        if (layerRefs) {
                            for (var k = 0; k < layerRefs.length; k++) {
                                var layerRef = layerRefs[k];
                                var cls = getCls(layerRef)
                                value2 += '<a href="blank" objid="'+attrSet+'" layerref="' + layerRef['_id'] + '" class="' + cls + '">' + name + '</a> '
                            }
                        }
                        else {
                            value2 += '<a href="blank" objid="'+attrSet+'" class="noref">' + name + '</a> '
                        }

                    }
                    
                    rows.push({
                        value: value,
                        value2: value2,
                        areaTemplate: au,
                        location: location,
                        year: year
                    })
                }
                res.data = rows
                return callback(null);
            })
        }]
        
    }
    async.auto(opts)
    
    
    
    
}

var getCls = function(layerRef) {
    var cls = 'ref'
    if (layerRef.analysis) {
        cls += ' refanalysis';
    }
    if (layerRef.active === false) {
        cls += ' refnoactive';
    }
    if (layerRef.available === false) {
        cls += ' refnoavailable';
    }
    return cls;
}




function getMetadata(params, req, res, callback) {
	/// JJJ nebude na to mít pycsw nějaké lepší API než SQL?
    var client = conn.getPgGeonodeDb();
    var layers = "'" + JSON.parse(params['layers']).join("','") + "'";
    var sql = 'SELECT \
		l.name, \
		b.title, \
		b.metadata_xml "data", \
		b.id, \
		b.abstract, \
		b.constraints_other, \
		b.temporal_extent_start::date "temporal_extent_start", \
		b.temporal_extent_end::date "temporal_extent_end", \
		p.first_name, \
		p.last_name, \
		p.email, \
		p.organization \
	FROM \
		base_resourcebase b \
		JOIN layers_layer l ON l.resourcebase_ptr_id = b.id \
		JOIN base_contactrole r ON r.resource_id = b.id \
		JOIN people_profile p ON p.id = r.contact_id \
	WHERE \
		r.role = \'pointOfContact\' AND \
		l.typename IN (' + layers + ')'
    //console.log("getMetadata SQL: ", sql);
    client.query(sql, function(err, resls) {
        if (err)
            return callback(err);
        var retData = [];
        for (var i=0;i<resls.rows.length;i++) {
			var obj = resls.rows[i];
            var parsed = new xmldoc.XmlDocument(obj.data);
            /*var obj = {
                title: parsed.valueWithPath('gmd:identificationInfo.gmd:MD_DataIdentification.gmd:citation.gmd:CI_Citation.gmd:title.gco:CharacterString'),
                abstract: parsed.valueWithPath('gmd:identificationInfo.gmd:MD_DataIdentification.gmd:abstract.gco:CharacterString'),
                mail: parsed.valueWithPath('gmd:contact.gmd:CI_ResponsibleParty.gmd:contactInfo.gmd:CI_Contact.gmd:address.gmd:CI_Address.gmd:electronicMailAddress.gco:CharacterString')
            }
            
            var name = parsed.valueWithPath('gmd:contact.gmd:CI_ResponsibleParty.gmd:individualName.gco:CharacterString')
            var organisation = parsed.valueWithPath('gmd:contact.gmd:CI_ResponsibleParty.gmd:organisationName.gco:CharacterString')*/

			obj.contact = obj.first_name + " " + obj.last_name;
			
            var keywords = parsed.descendantWithPath('gmd:identificationInfo.gmd:MD_DataIdentification.gmd:descriptiveKeywords.gmd:MD_Keywords');
            var keywordsVal = '';
            keywords = keywords || {children:[]};
            for (var j=0;j<keywords.children.length;j++) {
                var keyword = keywords.children[j];
                var val = keyword.valueWithPath('gco:CharacterString');
                if (!val) continue;
                keywordsVal += keywordsVal ? (', '+val) : val;
            }
            obj.keywords = keywordsVal;
            
			var temporalFrom = obj.temporal_extent_start;
            var temporalTo = obj.temporal_extent_end;
            var temporal = '';
            if (temporalFrom) temporal = temporalFrom.getFullYear();
            if (temporalTo) temporal += '&mdash;'+temporalTo.getFullYear();
            obj.temporal = temporal;
            
            //obj.address = config.geonetworkServer+'/srv/en/metadata.show?id='+resls.rows[i].id+'&currTab=ISOAll';
			obj.address = '/layers/geonode%3A'+obj.name+'#more';
			delete obj.data;
            retData.push(obj);
            
        }
        
        res.data = retData;
        return callback(null)
    })

}




function getSymbologiesFromServer(params, req, res, callback) {
    var opts = {
        symbologiesServer: function(asyncCallback) {
            var username = config.geoserverUsername;
            var password = config.geoserverPassword;
            var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
            var headers = {
                'Content-type': 'application/json',
                'Authorization': auth
            };

            var options = {
                host: conn.getGeoserverHost(),
				port: conn.getGeoserverPort(),
				path: conn.getGeoserverPath()+'/rest/styles.json',
                headers: headers,
                method: 'GET'
            };
            conn.request(options, null, function(err, output, resl) {
                if (err)
                    return callback(err);
                var styles = JSON.parse(output).styles.style;
                //console.log(styles)
                var names = [];
                for (var i = 0; i < styles.length; i++) {
                    names.push(styles[i].name)
                }
                asyncCallback(null, names)
            })
        },
        symbologiesDb: function(asyncCallback) {
            crud.read('symbology', {}, function(err, resls) {
                if (err)
                    return callback(err);
                var symbologies = [];
                for (var i = 0; i < resls.length; i++) {
                    symbologies.push(resls[i].symbologyName);
                }
                asyncCallback(null, symbologies)
            })
        },
        create: ['symbologiesServer', 'symbologiesDb', function(asyncCallback, results) {
                var symbologiesDb = symbologiesDb;
                var symbToCreate = us.difference(results.symbologiesServer, results.symbologiesDb)
                async.forEach(symbToCreate, function(symb, eachCallback) {
                    var obj = {
                        name: symb,
                        active: true,
                        symbologyName: symb
                    }
                    crud.create('symbology', obj, {userId: req.userId}, function(err) {
                        if (err)
                            callback(err);
                        eachCallback(null);
                    })

                }, function() {
                    asyncCallback(null)
                })
            }],
        delete: ['symbologiesServer', 'symbologiesDb', 'create', function(asyncCallback, results) {
                var symbToDel = us.difference(results.symbologiesDb, results.symbologiesServer)
                async.forEach(symbToDel, function(symb, eachCallback) {
                    var obj = {
                        symbologyName: symb
                    }
                    crud.read('symbology', obj, function(err, resls) {
                        async.forEach(resls, function(resl, eachCallback2) {
                            crud.remove('symbology', {_id: resl._id}, function(err) {
                                // if cannot remove continue
                                eachCallback2(null);
                            })
                        }, function() {
                            eachCallback(null);
                        })
                    })

                }, function() {
                    callback(null)
                })
            }]
    }
    async.auto(opts);

}



module.exports = {
    getLayers: getLayers,
    getMetadata: getMetadata,
    getLayerRefTable: getLayerRefTable,
    getLayerDetails: getLayerDetails,
    getSymbologiesFromServer: getSymbologiesFromServer,
    activateLayerRef: activateLayerRef,
    gatherLayerData: gatherLayerData,
    copyYears: copyYears
}
