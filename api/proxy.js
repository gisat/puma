
var http = require('http');
var querystring = require('querystring');
var conn = require('../common/conn');
var data = require('../data/data');
var fs = require('fs');
var sldMap = {};
var sldMapTemp = {};
var densityMap = {};
var chartConfMap = {};
var async = require('async')
var crud = require('../rest/crud');
var layers = require('./layers')
var us = require('underscore')

function wms(params, req, res, callback) {

    var sldId = params['SLD_ID']
    var useFirst = true;
    if (params['LAYERS'] && params['LAYERS'].indexOf('#userpolygon#')>-1) {
        useFirst = false;
        params['LAYERS'] = params['LAYERS'].replace('#userpolygon#','');
        params['LAYERS'] = params['LAYERS'].replace('#userid#',req.userId);
        if (params['QUERY_LAYERS']) {
            params['QUERY_LAYERS'] = params['QUERY_LAYERS'].replace('#userpolygon#','')
            params['QUERY_LAYERS'] = params['QUERY_LAYERS'].replace('#userid#',req.userId);
        }
        if (params['REQUEST'] == 'GetMap') {
            params['STYLES'] = 'polygon';
        }      
    }
    if (params['USE_SECOND']) {
        useFirst = false;
    }
    if (sldId) {
        var sld = sldMap[sldId] || sldMapTemp[sldId];
        params['SLD_BODY'] = params['REQUEST'] == 'GetMap' ? sld.sld : sld.legendSld
        
        useFirst = false;
        delete params['STYLES'];
        delete params['LAYERS'];
        var density = densityMap[sldId];
        if (density) {
            var bbox = params['BBOX'].split(',');
            var xSize = parseFloat(bbox[2])-parseFloat(bbox[0]);
            var ySize = parseFloat(bbox[3])-parseFloat(bbox[1]);
            var size = xSize*ySize;
            var count = size/density;
            var averageArea = params['WIDTH']*params['HEIGHT']/count;
            
            var maxSize = averageArea/2;
            maxSize = Math.min(maxSize,150000);
            maxSize = Math.max(maxSize,1000);
            
            if (averageArea<200) {
                maxSize = 1;
            }
            console.log(maxSize);
            params['env'] = 'maxsize:'+maxSize
        }
    }
    if (params['REQUEST'] == 'GetFeatureInfo') {
        useFirst = false;
        params['FORMAT'] = 'application/json'
        params['INFO_FORMAT'] = 'application/json'
        params['EXCEPTIONS'] = 'application/json'
    }
    if (params['LAYERS']) {
        params['LAYER'] = params['LAYERS'].split(',')[0]
    }
    var username = useFirst ? 'gnode' : 'tomasl84';
    var password = useFirst ? 'geonode' : 'lou840102';
    
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var headers = {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    var options = {
        host: conn.getBaseServer(),
        port: conn.getPort(),
        timeout: 60000,
        //path: '/geoserver/geonode/wms?'+querystring.stringify(params),
        path: useFirst ? '/geoserver/geonode/wms' : '/geoserver_i2/puma/wms',
        headers: headers,
        method: 'POST'

    };
    
    

    var data = querystring.stringify(params)
    if (params['REQUEST'] == 'GetMap' || params['REQUEST']=='GetLegendGraphic') {
        options.resEncoding = 'binary';
    }
    if (params['REQUEST'] == 'GetLegendGraphic') {
    }
    conn.request(options, data, function(err, output, resl) {
        if (err)
            return callback(err);
        
        res.data = output;
        if (params['REQUEST'] == 'GetFeatureInfo') {
            if (params['COMPLETELAYER']) {
                layers.gatherLayerData(output,function(err,layerData) {
                    if (err)
                        return callback(err);
                    res.data = layerData;
                    return callback(null);
                });
                return;
            }
            else {
                res.noJson = true;
            }
        }
        else {
            res.contType = params['FORMAT'];
        }
        return callback(null);
    })
}

function saveSld(params, req, res, callback) {
    var id = generateId();
    var oldId = params['oldId'];
    var sld = params['sldBody'];
    var legendSld = params['legendSld'] || '';
    params['userId'] = req.userId;
    var userLocation = 'user_'+req.userId+'_loc_'+params['location'];
    sld = sld.replace(new RegExp('#userlocation#','g'),userLocation);
    if (params['showChoropleth']) {
        var attrs = JSON.parse(params['attrs']);
        var numCat = parseInt(params['numCategories']);
        
        var attrIndex = params['mapAttributeIndex'] || 0;
        var attrName = 'as_' + attrs[attrIndex].as + '_attr_' + attrs[attrIndex].attr;

    }
    if (params['showMapChart']) {
        var normAttr = [{area:true}]
        var normAttrName = 'area'
        if (params['normalization'] && params['normalization']=='attribute') {
            var normObj = {as:params['normalizationAttributeSet'],attr:params['normalizationAttribute']}
            normAttr = [normObj];
            normAttrName = 'as_'+normObj.as+'_attr_'+normObj.attr;
        }
    }
    var opts = {
        
        data: function(asyncCallback) {
            if (!params['showChoropleth'] && !params['showMapChart']) {
                return asyncCallback(null);
            }
            var dataParams = us.clone(params);
            dataParams['aggregate'] = 'min,max';
            if (params['showChoropleth']) {
                dataParams['attrs'] = JSON.stringify([attrs[attrIndex]]);
                dataParams['sort'] = JSON.stringify([{
                        property: attrName,
                        direction: 'ASC'
                    }])
                if (dataParams['zeroesAsNull']) {
                    dataParams['filter'] = JSON.stringify([{
                            field: attrName,
                            value: 0,
                            comparison: 'gt'
                        }])
                }
                dataParams['normalization'] = dataParams['normalization']=='year' ? 'none' : dataParams['normalization']
                
            }
            else {
                dataParams['normalization'] = 'none';
                dataParams['attrs'] = JSON.stringify(normAttr);
                
            }
            dataParams['normalizationYear'] = null;
            data.getData(dataParams, function(err, dataObj) {
                if (err)
                    return callback(err);
                if (params['altYears']) {
                    dataParams['years'] = params['altYears'];
                    data.getData(dataParams, function(err, dataObj2) {
                        if (err)
                            return callback(err);
                        dataObj.altAggregate = dataObj2.aggregate;
                        return asyncCallback(null, dataObj);
                    })
                }
                else {
                    return asyncCallback(null, dataObj);
                }
            })
        },
        layerRef: function(asyncCallback) {
            if (!params['showMapChart']) {
                return asyncCallback(null);
            }
            var loc = null;
            var at = null;
            var year = JSON.parse(params['years'])[0];
            var areas = JSON.parse(params['areas'])
            for (var area in areas) {
                loc = area;
                for (var areaTemp in areas[loc]) {
                    at = areaTemp;
                    break;
                }
                break;
            }
            var query = {
            $and: [
                {location: parseInt(loc)},
                {areaTemplate: parseInt(at)},
                {year: year},
                {isData: false},
                {active: {$ne:false}} 
            ]}
            crud.read('layerref',query,function(err,resls) {
                if (err) return callback(err);
                var layerName = resls[0] ? resls[0]._id : ('user_'+req.userId+'_loc_'+params['location']+'_y_'+year);
                //console.log(layerName)
                //console.log(params['location'])
                return asyncCallback(null,layerName);
            })
        },
        density: ['layerRef',function(asyncCallback,results) {
            if (!params['showMapChart']) {
                return asyncCallback(null);
            }
            var year = JSON.parse(params['years'])[0];
            var sql = 'SELECT COUNT(*),ST_XMax(#bbox#)-ST_XMin(#bbox#) as width,ST_YMax(#bbox#)-ST_YMin(#bbox#) as height FROM views.layer_'+results.layerRef;
            sql = sql.replace(new RegExp('#bbox#','g'),'ST_Extent(ST_Transform(the_geom,900913))');
            var client = conn.getPgDb();
            client.query(sql, [], function(err, resls) {
                if (err)
                    return callback(err);
                var obj = resls.rows[0];
                var density = obj.width*obj.height/obj.count;
                console.log(density)
                densityMap[id] = density;
                asyncCallback(null);
            })
        }],
        result: ['data', 'layerRef','density',function(asyncCallback, results) {
            
            
            var topTreeNorm = params['normalization'] == 'toptree';
            if (params['showMapChart']) {
                var urlParams = '${gid}/' + id;
                
                var min = results.data.altAggregate ? Math.min(results.data.aggregate['min_'+normAttrName],results.data.altAggregate['min_'+normAttrName]) : results.data.aggregate['min_'+normAttrName];
                var max = results.data.altAggregate ? Math.max(results.data.aggregate['max_'+normAttrName],results.data.altAggregate['max_'+normAttrName]) : results.data.aggregate['max_'+normAttrName];
                if (min==max) {
                    max = min+1;
                }
                sld = sld.replace(new RegExp('#attr#','g'), normAttrName);
                sld = sld.replace(new RegExp('#minval#','g'), min);
                sld = sld.replace(new RegExp('#maxval#','g'), max);
                sld = sld.replace(new RegExp('#url#','g'), urlParams);
            }
            if (params['showChoropleth']) {
                sld = sld.replace(new RegExp('#toptree#','g'),results.data.aggData.length ? results.data.aggData[0][attrName] : 1);
                sld = sld.replace(new RegExp('#attr#','g'),attrName);
                sld = sld.replace(new RegExp('#attrid#','g'),attrs[attrIndex].attr);
                var min = results.data.altAggregate ? Math.min(results.data.aggregate['min_'+attrName],results.data.altAggregate['min_'+attrName]) : results.data.aggregate['min_'+attrName];
                var max = results.data.altAggregate ? Math.max(results.data.aggregate['max_'+attrName],results.data.altAggregate['max_'+attrName]) : results.data.aggregate['max_'+attrName];
                console.log(max);
                console.log(min);
                if (params['classType']=='continuous') {
                    for (var i=0;i<numCat;i++) {
                        var val = min + (max-min)*i/(numCat-1);
                        console.log(i);
                        console.log(val)
                        sld = sld.replace(new RegExp('#minmax_'+(i+1)+'#','g'),val);
                        legendSld = legendSld.replace(new RegExp('#minmax_'+(i+1)+'#','g'),val);
                    }
                }
                
                else if (params['classType']=='quantiles') {
                    var dataLength = results.data.data.length
                    numCat = Math.min(numCat,dataLength)
                    var catSize = Math.floor(dataLength/numCat);
                    var restSize = dataLength - catSize * numCat;
                    var newRest = restSize;
                    var catIdx = 0;
                    var val = 0;
                    for (var i=1;i<dataLength;i++) {
                        var idx = i;
                        var diff = catSize + ((newRest>0) ? 1 : 0);
                        if (idx % diff == 0) {
                            newRest--;
                            catIdx++;
                            var item = results.data.data[idx];
                            var current = results.data.data[idx][attrName];
                            var prev = results.data.data[idx - 1][attrName];
                            if (prev!=null && dataLength!=1) {
                                val = prev+(current-prev)/2;
                                sld = sld.replace(new RegExp('#val_'+catIdx+'#','g'),val);
                                legendSld = legendSld.replace(new RegExp('#val_'+catIdx+'#','g'),val);
                            }
                        }
                    }
                    sld = sld.replace(new RegExp('#val_[0-9]+#','g'),val);
                    legendSld = legendSld.replace(new RegExp('#val_[0-9]+#','g'),val);
                    if (dataLength==1) {
                        //console.log(sld);
                    }
                }
                else if (params['classType']=='equal') {
                    for (var i=1;i<numCat;i++) {
                        var val = min + (max-min)*i/numCat;
                        sld = sld.replace(new RegExp('#val_'+i+'#','g'),val);
                        legendSld = legendSld.replace(new RegExp('#val_'+i+'#','g'),val);
                    }
                }
            }
            //console.log(sld)
            sldMap[id] = {
                sld: sld,
                legendSld: legendSld
            }
            if (params['areas']) {
                delete params['sldBody'];
                chartConfMap[id] = params;
            }

            if (sldMap[oldId]) {
                delete sldMap[oldId];

            }
            if (chartConfMap[oldId]) {
                delete chartConfMap[oldId];
            }
            if (densityMap[oldId]) {
                delete densityMap[oldId];
            }
            
            //console.log(sld);

            res.data = id;
            return callback(null);
            }]
    }
    async.auto(opts)


}

function getSld(params, req, res, callback) {
    res.data = sldMap[params['id']];
    return callback(null);
}

function getSldSync(id) {
    return sldMap[id]
}
function setSldTemp(sld) {
    var id = generateId();
    sldMapTemp[id] = sld;
    return id;
}



var generateId = function() {
    var time = new Date().getTime();
    var random = Math.round(Math.random() * 100000);
    var id = time.toString(32) + random.toString(32);
    return id;
}


module.exports = {
    wms: wms,
    saveSld: saveSld,
    getSld: getSld,
    getSldSync: getSldSync,
    setSldTemp: setSldTemp,
    chartConfMap: chartConfMap
}


