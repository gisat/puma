
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
var jsid = null;
var cacheStyleMap = null;
var layerGroupMap = null;
var config = require('../config');


function wms(params, req, res, callback) {
    
    if (!layerGroupMap) {
        crud.read('layergroupgs',{},function(err,items) {
            items = items || [];
            layerGroupMap = {};
            for (var i=0;i<items.length;i++) {
                var item = items[i];
                layerGroupMap[item.layers] = layerGroupMap[item.layers] || {};
                layerGroupMap[item.layers][item.style] = item.name;
            }  
        })
        
        
    }
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
		if(typeof sld == 'undefined'){
			console.log("======= SLD ERROR. sldId: ",sldId,"\n\nsldMap:",sldMap,"\n\nsldMapTemp:",sldMapTemp);
		}
        params['SLD_BODY'] = params['REQUEST'] == 'GetMap' ? sld.sld : sld.legendSld;
        
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
            //console.log(maxSize);
            params['env'] = 'maxsize:'+maxSize
        }
    }
    if (params['REQUEST'] == 'GetFeatureInfo') {
        useFirst = false;
        params['FORMAT'] = 'application/json';
        params['INFO_FORMAT'] = 'application/json';
        params['EXCEPTIONS'] = 'application/json';
		params['FEATURE_COUNT'] = '42';
    }
    if (params['LAYERS']) {
        params['LAYER'] = params['LAYERS'].split(',')[0];
    }
	var host = useFirst ? conn.getGeoserverHost() : conn.getGeoserver2Host();
    var path = useFirst ? conn.getGeoserverPath()+'/geonode/wms' : conn.getGeoserver2Path()+'/puma/wms';
    var port = useFirst ? conn.getGeoserverPort() : conn.getGeoserver2Port();
    var method = 'POST';
    var style = params['STYLES'] ? params['STYLES'].split(',')[0] : '';
    var layers = params['LAYERS'];
    var layerGroup = (useFirst && params['REQUEST']=='GetMap' && layerGroupMap && layerGroupMap[layers]) ? layerGroupMap[layers][style || 'def'] : '';
    
	
	//console.log("================layerGroup: ", layerGroup, "\n==========layerGroupMap: ",layerGroupMap);
	
    if (useFirst && params['REQUEST']=='GetMap' && layerGroupMap && layerGroup!=1){
        
        delete params['TILED'];
        //delete params['TRANSPARENT'];
        delete params['LAYER'];
        // single layer
        if (layers.search(',')<0) {
            if(style && !layerGroup){
                console.log('Add style '+layers+' '+style)
                createLayerGroup(layers,style,true);
            }else{
                console.log('Single layer '+layers+' '+style)
                path = conn.getGeoserverPath()+'/gwc/service/wms';
            }
        }
        // found layer group
        else if (layerGroup) {
            console.log('Layer group found '+layerGroup+' '+style)
            params['LAYERS'] = layerGroup;
            params['STYLES'] = style;
            path = conn.getGeoserverPath()+'/gwc/service/wms';
        }
        // layer group to be created
        else {
            console.log('Creating group, styles: '+style)
            createLayerGroup(layers,style);
        }
        method = 'GET';
        port = null; //// JJJJJ Proc to?
        
    }else{
		console.log("useFirst: ", useFirst, "params[request]:",params['request']);
	}
	
	
    var username = useFirst ? config.geoserverUsername : config.geoserver2Username;
    var password = useFirst ? config.geoserverPassword : config.geoserver2Password;
    
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var headers = {};
    var data = null;
    if (useFirst && jsid) {
        headers['Cookie'] = 'JSESSIONID='+jsid;
    }
    if (!useFirst) {
        headers['Authorization'] = auth;
        //console.log(new Date())
    }
    if (method=='GET') {
        var queryParams = '?'+querystring.stringify(params);
        path += queryParams;
    }else{
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        
        data = querystring.stringify(params)
    }
    var options = {
        host: host,
        port: port,
        timeout: 60000,
        //path: '/geoserver/geonode/wms?'+querystring.stringify(params),
        path: path,
        headers: headers,
        method: method

    };
    
    
    if (params['REQUEST'] == 'GetMap' || params['REQUEST']=='GetLegendGraphic') {
        options.resEncoding = 'binary';
    }
    if (params['REQUEST'] == 'GetLegendGraphic') {
    }
    var time = new Date().getTime();
	console.log("\n\n========= WMS "+(useFirst ? "geoserver":"geoserver_i2")+". PARAMS: ",params);
    conn.request(options, method=='GET' ? null : data, function(err, output, resl) {
        if (err) {
            console.log("\nProxy error: ", err, "options: ", options);
            return callback(err);
        }
        //console.log(new Date().getTime()-time);
        if (useFirst) {
            //console.log(req.originalUrl);
            //console.log(output.length);
            
        }
        if (output.length<10000 && (output.indexOf("PNG") == -1 || output.indexOf("PNG") > 8)) {
            console.log("\nDostatecne maly vystup: " + output + "  \nOPTIONS: ",options,"\n\nDATA: "+data);
        }
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
//    setTimeout(function() {
//        reqs.abort();
//    },5000);
    
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
	
	legendSld = legendSld.replace(/<sld\:Name>#val_(\d+)# \- #val_(\d+)#<\/sld\:Name>/g, "<sld:Name>#val_$1#—#val_$2#</sld:Name>");
	legendSld = legendSld.replace(/<sld\:Name>#val_(\d+)# &gt;<\/sld\:Name>/g, "<sld:Name>&gt; #val_$1#</sld:Name>");

    var opts = {
        attrConf: function(asyncCallback) {
            if (!params['attrs']) {
                return asyncCallback(null)
            }
            data.getAttrConf(params, function(err, attrConf) {
                if (err)
                    return callback(err);

                return asyncCallback(null, attrConf);
            })
        },
        data: ['attrConf',function(asyncCallback,results) {
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
                }else{
					console.log("ZeroesAsNull ~FALSE +*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*");
				}
                dataParams['normalization'] = dataParams['normalization']=='year' ? 'none' : dataParams['normalization']
                
            }
            else {
                dataParams['normalization'] = 'none';
                dataParams['attrs'] = JSON.stringify(normAttr);
                
            }
            dataParams['normalizationYear'] = null;
            dataParams['sortNorm'] = JSON.stringify(attrs[attrIndex]);
            dataParams.attrMap = results.attrConf.prevAttrMap;
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
        }],
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
            var client = conn.getPgDataDb();
            client.query(sql, [], function(err, resls) {
                if (err)
                    return callback(err);
                var obj = resls.rows[0];
                var density = obj.width*obj.height/obj.count;
                //console.log(density)
                densityMap[id] = density;
                asyncCallback(null);
            })
        }],
        result: ['data', 'layerRef','density','attrConf',function(asyncCallback, results) {
            
            
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
               
                var fixNum = 0;
                if (max<100000 || diff<10000) {
                    fixNum = 1;
                }
                if (max<1000 || diff<100) {
                    fixNum = 2;
                }
                if (max<10 || diff<1) {
                    fixNum = 3;
                }
                if (params['classType']=='continuous') {
                    for (var i=0;i<numCat;i++) {
                        var val = min + (max-min)*i/(numCat-1);
                        val = val.toFixed(fixNum);
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
                                val = val.toFixed(fixNum);
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
                        val = val.toFixed(fixNum);
                        sld = sld.replace(new RegExp('#val_'+i+'#','g'),val);
                        legendSld = legendSld.replace(new RegExp('#val_'+i+'#','g'),val);
                    }
                }
            }
            //console.log(sld)
            if (results.attrConf) {
                //console.log(results.attrConf.attrMap.units)
                legendSld = legendSld.replace(new RegExp('#units#','g'),results.attrConf.attrMap.units).replace('<sup>','').replace('</sup>','');
                
            }
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
function createLayerGroup(layers,style,addStyle) {
    var username = config.geoserverUsername;
    var password = config.geoserverPassword;
    layerGroupMap[layers] = layerGroupMap[layers] || {};
    layerGroupMap[layers][style || 'def'] = 1;
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var headers = {
        'Content-type': 'application/json',
        'Authorization': auth
    };
    
    if (addStyle) {
        var path = conn.getGeoserverPath()+'/rest/layers/' + layers + '/styles.json'
        var obj = {
            style: {
                name: style
            }
        }
        var name = 2;
    }else{
        var path = conn.getGeoserverPath()+'/rest/layergroups.json'
        var name = layers.substring(0, 17) + '_' + require('crypto').randomBytes(5).toString('hex')
        var obj = {
            layerGroup: {
                name: name,
                layers: {
                    layer: []
                },
                styles: {
                    style: []
                }
            }

        }
        var layersArr = layers.split(',');
        for (var i = 0; i < layersArr.length; i++) {
            var layer = layersArr[i];
            obj.layerGroup.layers.layer.push({name: layer})
            obj.layerGroup.styles.style.push({name: style})
        }
        if (!style) {
            delete obj.layerGroup.styles;
        }
    }
    var data = JSON.stringify(obj);

    var options = {
        host: conn.getGeoserverHost(),
        path: path,
        headers: headers,
        port: conn.getGeoserverPort(),
        method: 'POST'
    };
	console.log("################ ### ### ### ### proxy.createLayerGroup options: ",options,"\n####### data:", data);
    conn.request(options, data, function(err, output, resl) {
		if(err){
			console.log("\n\n------ LayerGroup not created! -------\n\nError:",err);
		}else{
			console.log("####### output: ", output);
	        layerGroupMap[layers][style || 'def'] = name;
	        crud.create('layergroupgs',{name:name,layers:layers,style:style || 'def'},function(){});
		}
    });
    
}
function setJsid(newJsid) {
    jsid = newJsid;
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
    setJsid: setJsid,
    saveSld: saveSld,
    getSld: getSld,
    getSldSync: getSldSync,
    setSldTemp: setSldTemp,
    chartConfMap: chartConfMap
}


