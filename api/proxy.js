var http = require('http');
var querystring = require('querystring');
var conn = require('../common/conn');
var data = require('../data/data');
var fs = require('fs');
var sldMap = {};
var sldMapTemp = {};
var densityMap = {};
var chartConfMap = {};
var async = require('async');
var crud = require('../rest/crud');
var layers = require('./layers');
var _ = require('underscore');
var jsid = null;
var layerGroupMap = null;
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

let promisedFs = require('pn/fs');
let path = require('path');

function wms(params, req, res, callback) {

	if(params.hasOwnProperty(`tiled`)) {
		delete params.tiled;
	}

	keysToUpperCase(params);
	// todo find out why is not possible to use CRS
	if (params.hasOwnProperty('CRS')){
		params['SRS'] = params['CRS'];
		delete params['CRS'];
	}
	// it solves an issue with choropleths in 3D
	if (params.hasOwnProperty('VERSION')){
		params['VERSION'] = params['1.1.1'];
	}
	// it solves wrong bbox for combination geoserver-web world wind
	if (params.hasOwnProperty('SRS') && params['SRS'] == "EPSG:4326"){
		var bounbox = params['BBOX'].split(',');
		params['BBOX'] = bounbox[1] + "," + bounbox[0] + "," + bounbox[3] + "," + bounbox[2];
	}


	if (!layerGroupMap) {
		crud.read('layergroupgs',{},function(err,items) {
			items = items || [];
			layerGroupMap = {};
			for (var i=0;i<items.length;i++) {
				var item = items[i];
				layerGroupMap[item.layers] = layerGroupMap[item.layers] || {};
				layerGroupMap[item.layers][item.style] = item.name;
			}
		});


	}
	var sldId = params['SLD_ID'];
	var useFirst = true;
	if (params['LAYERS'] && params['LAYERS'].indexOf('#userpolygon#')>-1) {
		useFirst = false;
		params['LAYERS'] = params['LAYERS'].replace('#userpolygon#','');
		params['LAYERS'] = params['LAYERS'].replace('#userid#', req.session.userId);
		if (params['QUERY_LAYERS']) {
			params['QUERY_LAYERS'] = params['QUERY_LAYERS'].replace('#userpolygon#','');
			params['QUERY_LAYERS'] = params['QUERY_LAYERS'].replace('#userid#', req.session.userId);
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

		// missing SLD - probably node server restart
		if(typeof sld == 'undefined'){
			console.log("======= SLD ERROR. sldId: ",sldId,"\n\nsldMap:",sldMap,"\n\nsldMapTemp:",sldMapTemp);
		}
        params['SLD_BODY'] = params['REQUEST'] == 'GetMap' ? sld.sld : sld && sld.legendSld || '<?xml version="1.0" encoding="UTF-8"?><sld:StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:sld="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0"><sld:NamedLayer><sld:Name>Default Styler</sld:Name><sld:UserStyle><sld:Name>Default Styler</sld:Name><sld:FeatureTypeStyle><sld:Name>name</sld:Name></sld:FeatureTypeStyle></sld:UserStyle></sld:NamedLayer></sld:StyledLayerDescriptor>';

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
			params['env'] = 'maxsize:'+maxSize;
		}
	}
  var workspace = useFirst ? 'geonode' : config.geoserver2Workspace;
  if (params['REQUEST'] == 'GetFeatureInfo') {
		useFirst = false;
		workspace = config.geoserver2Workspace;
		params['FORMAT'] = 'application/json';
		params['INFO_FORMAT'] = 'application/json';
		params['EXCEPTIONS'] = 'application/json';
		params['FEATURE_COUNT'] = '42';
    if (params['LAYERS']) {
      workspace = params['LAYERS'].split(':')[0];
    }
	}
	if (params['LAYERS']) {
    params['LAYER'] = params['LAYERS'].split(',')[0];
	}
	var wmsParamLayers = params['LAYERS'];
	var host = useFirst ? config.geoserverHost : config.geoserverHost;
	var path = useFirst ? config.geoserverPath + '/geonode/wms' : config.geoserverPath+'/' + config.geoserverWorkspace + '/wms';
	var port = useFirst ? config.geoserverPort : config.geoserverPort;
	var method = 'POST';
	var style = params['STYLES'] ? params['STYLES'].split(',')[0] : '';
	var layerGroup = (useFirst && params['REQUEST']=='GetMap' && layerGroupMap && layerGroupMap[wmsParamLayers]) ? layerGroupMap[wmsParamLayers][style || 'def'] : '';

	
	//console.log("================layerGroup: ", layerGroup, "\n==========layerGroupMap: ",layerGroupMap);
	
	if (useFirst && params['REQUEST']=='GetMap' && layerGroupMap && layerGroup!=1){

		delete params['TILED'];
		//delete params['TRANSPARENT'];
		delete params['LAYER'];
		// single layer
		if (wmsParamLayers.search(',')<0) {
			if(style && !layerGroup){
				//console.log('Add style '+layers+' '+style)
				createLayerGroup(wmsParamLayers,style,true);
			}else{
				//console.log('Single layer '+layers+' '+style)
				path = config.geoserverPath+'/gwc/service/wms';
			}
		}
		// found layer group
		else if (layerGroup) {
			//console.log('Layer group found '+layerGroup+' '+style)
			params['LAYERS'] = layerGroup;
			params['STYLES'] = style;
			path = config.geoserverPath+'/gwc/service/wms';
		}
		// layer group to be created
		else {
			//console.log('Creating group, styles: '+style)
			createLayerGroup(wmsParamLayers,style);
		}
		method = 'GET';
		
	}else{
		//console.log("useFirst: ", useFirst, "params[request]:",params['request']);
	}


	if(!params['VERSION']) {
		params['VERSION'] = "1.1.1"
	}
	
	
	var username = useFirst ? config.geoserverUsername : config.geoserverUsername;
	var password = useFirst ? config.geoserverPassword : config.geoserverPassword;

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

		data = querystring.stringify(params);
	}
	var options = {
		host: host,
		port: port,
		timeout: 60000,
		path: path,
		headers: headers,
		method: method
	};


	if (params['REQUEST'] == 'GetMap' || params['REQUEST']=='GetLegendGraphic') {
		options.resEncoding = 'binary';
	}
	if (params['REQUEST'] == 'GetLegendGraphic') {
		// TODO: Figure out sane solution to handling the legend.
		if(wmsParamLayers && wmsParamLayers.indexOf(',') == -1 && wmsParamLayers.indexOf('panther:') != 0) {
			options.path = options.path.replace('geonode', wmsParamLayers.split(':')[0]);
		}
	}

	conn.request(options, method=='GET' ? null : data, function(err, output, resl) {
		if (err) {
			logger.error("Proxy error: ", err, " Options: ", options);
			return callback(err);
		}

		if (output.length<10000 && (output.indexOf("PNG") == -1 || output.indexOf("PNG") > 8)) {
			logger.info("\nDostatecne maly vystup: " + output + "  \nOPTIONS: ",options);
		}
		res.data = output;
		if (params['REQUEST'] == 'GetFeatureInfo') {
			if (params['COMPLETELAYER']) {
				layers.gatherLayerData(output,function(err,layerData) {
					if (err) {
						logger.error("api/proxy.js Error: ", err, " Output:", output);
						return callback(err);
					}
					res.data = layerData;
					return callback(null);
				});
				return;
			} else if (params['EXPECTJSON']) {
				res.isJson = true;
			} else {
				res.noJson = true;
			}
		} else {
			res.contType = params['FORMAT'];
		}
		return callback(null);
	});
//    setTimeout(function() {
//        reqs.abort();
//    },5000);

}

/**
 * Convert all keys of object to uppercase
 * @param obj {Object}
 * @returns {Object}
 */
function keysToUpperCase (obj){
	for (var key in obj){
		var upper = key.toUpperCase();
		if( upper !== key ){
			obj[ upper ] = obj[key];
			delete obj[key];
		}
	}
}

function storeTemporarySld(id, sld) {
	let pathSld = path.resolve(config.temporarySldFilesPath + id + '.sld');
	return promisedFs.writeFile(pathSld, sld);
}

function saveSld(params, req, res, callback) {
	var id = generateId();
	var oldId = params['oldId'];
	var sld = params['sldBody'];
	var legendSld = params['legendSld'] || '';
	params['userId'] = req.session.userId;
	var userLocation = 'user_' + req.session.userId + '_loc_' + params['location'];

	logger.info(`api/proxy.js#saveSld Save New Id: ${id} OldId: ${oldId} userLocation: ${userLocation}`);
	sld = sld.replace(new RegExp('#userlocation#','g'),userLocation);
	if (params['showChoropleth']) {
		var attrs = JSON.parse(params['attrs']);
		var numCat = parseInt(params['numCategories']);
		var attrIndex = params['mapAttributeIndex'] || 0;
		var attrName = 'as_' + attrs[attrIndex].as + '_attr_' + attrs[attrIndex].attr;
	}
	if (params['showMapChart']) {
		var normAttr = [{area:true}];
		var normAttrName = 'area';
		if (params['normalization'] && params['normalization']=='attribute') {
			var normObj = {as:params['normalizationAttributeSet'],attr:params['normalizationAttribute']};
			normAttr = [normObj];
			normAttrName = 'as_'+normObj.as+'_attr_'+normObj.attr;
		}
	}

	// Why the hell would I do this?
	legendSld = legendSld.replace(/<sld\:Name>#val_(\d+)# \- #val_(\d+)#<\/sld\:Name>/g, "<sld:Name>#val_$1#—#val_$2#</sld:Name>");
	legendSld = legendSld.replace(/<sld\:Name>#val_(\d+)# &gt;<\/sld\:Name>/g, "<sld:Name>&gt; #val_$1#</sld:Name>");

	var opts = {
		attrConf: function(asyncCallback) {
			if (!params['attrs']) {
				return asyncCallback(null);
			}
			data.getAttrConf(params, function(err, attrConf) {
				if (err) {
					return callback(err);
				}
				return asyncCallback(null, attrConf);
			});
		},
		data: ['attrConf',function(asyncCallback,results) {
			if (!params['showChoropleth'] && !params['showMapChart']) {
				return asyncCallback(null);
			}

			logger.info(`api/proxy.js#saveSld#data ShowChoropleth: ${params["showChoropleth"]} AttrConfig: `, results.attrConf);

			var dataParams = _.clone(params);
			dataParams['aggregate'] = 'min,max';
			if (params['showChoropleth']) {
				dataParams['attrs'] = JSON.stringify([attrs[attrIndex]]);
				dataParams['sort'] = JSON.stringify([{
						property: attrName,
						direction: 'ASC'
					}]);
				if (dataParams['zeroesAsNull']) {
					dataParams['filter'] = JSON.stringify([{
						field: attrName,
						value: 0,
						comparison: 'gt'
					}]);
				}else{
					//console.log("ZeroesAsNull ~FALSE +*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*");
				}
				dataParams['normalization'] = dataParams['normalization']=='year' ? 'none' : dataParams['normalization'];

			} else {
				dataParams['normalization'] = 'none';
				dataParams['attrs'] = JSON.stringify(normAttr);
			}
			dataParams['normalizationYear'] = null;
			dataParams['sortNorm'] = JSON.stringify(attrs[attrIndex]);
			dataParams.attrMap = results.attrConf.prevAttrMap;
			data.getData(dataParams, function(err, dataObj) {
				if (err) {
					logger.error("api/proxy.js getData. Params: ", dataParams, " Error: ", err);
					return callback(err);
				}
				if (params['altYears']) {
					dataParams['years'] = params['altYears'];
					data.getData(dataParams, function(err, dataObj2) {
						if (err) {
							return callback(err);
						}
						dataObj.altAggregate = dataObj2.aggregate;
						return asyncCallback(null, dataObj);
					})
				} else {
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
			var areas = JSON.parse(params['areas']);
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
			]};
			crud.read('layerref',query,function(err,resls) {
				if (err) {
					logger.error("api/proxy.js layerRef. It wasn't possible to read Layerref with filter: ", query, " Error: ", err);
					return callback(err);
				}
				var layerName = resls[0] ? resls[0]._id : ('user_' + req.session.userId + '_loc_' + params['location'] + '_y_' + year);
				//console.log(layerName);
				//console.log(params['location']);
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
				if (err) {
					logger.error("api/proxy.js density. Sql: ", sql, " Error: ", err);
					return callback(err);
				}
				var obj = resls.rows[0];
				var density = obj.width*obj.height/obj.count;
				//console.log(density)
				densityMap[id] = density;
				asyncCallback(null);
			})
		}],
		result: ['data', 'layerRef','density','attrConf',function(asyncCallback, results) {
			logger.info(`api/proxy.js#saveSld#result Data: `,results.data,` LayerRef: ${results.layerRef} Density: ${results.density} AttrConf: ${results.attrConf}`);

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
				} else if (params['classType']=='quantiles') {
					var dataLength = results.data.data.length;
					numCat = Math.min(numCat,dataLength);
					var catSize = Math.floor(dataLength/numCat);
					var restSize = dataLength - catSize * numCat;
					var newRest = restSize;
					var catIdx = 0;
					var val = 0;
					logger.info(`api/proxy.js#saveSld#result Data length: ${dataLength}, Category size: ${catSize}, NumberOfCategories: ${numCat}, RestSize: ${restSize}, Attribute Name: ${attrName}`);
					// In this part we actually decide what amounts will be used for which part of legend.
					for (var i=1;i<dataLength;i++) {
						var idx = i;
						var diff = catSize + ((newRest>0) ? 1 : 0);
						if (idx % diff == 0) {
							newRest--;
							catIdx++;
							var item = results.data.data[idx];
							var current = Number(results.data.data[idx][attrName]);
							var prev = Number(results.data.data[idx - 1][attrName]);
							logger.info(`api/proxy.js#saveSld#result Current: ${current}, Previous: ${prev}, ActualValue: ${val}`);
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
				} else if (params['classType']=='equal') {
					for (var i=1;i<numCat;i++) {
						var val = min + (max-min)*i/numCat;
						val = val.toFixed(fixNum);
						sld = sld.replace(new RegExp('#val_'+i+'#','g'),val);
						legendSld = legendSld.replace(new RegExp('#val_'+i+'#','g'),val);
					}
				}
			}
			if (results.attrConf) {
				logger.info('api/proxy#saveSld Handle Units: ', results.attrConf.attrMap);
				legendSld = legendSld.replace(new RegExp('#units#','g'), results.attrConf.attrMap.units);
			}
			sldMap[id] = {
				sld: sld,
				legendSld: legendSld
			};
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
			logger.info(`api/proxy.js#saveSld#result Id: ${id}`);

			storeTemporarySld(id, sld);
			storeTemporarySld(id + 'legend', legendSld);

			res.data = id;
			return callback(null);
			}]
	};
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
		var path = config.geoserverPath+'/rest/layers/' + layers + '/styles.json';
		var obj = {
			style: {
				name: style
			}
		};
		var name = 2;
	}else{
		var path = config.geoserverPath+'/rest/layergroups.json';
		var name = layers.substring(0, 17) + '_' + require('crypto').randomBytes(5).toString('hex');
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
		};
		var layersArr = layers.split(',');
		for (var i = 0; i < layersArr.length; i++) {
			var layer = layersArr[i];
			obj.layerGroup.layers.layer.push({name: layer});
			obj.layerGroup.styles.style.push({name: style});
		}
		if (!style) {
			delete obj.layerGroup.styles;
		}
	}
	var data = JSON.stringify(obj);

	var options = {
		host: config.geoserverHost,
		path: path,
		headers: headers,
		port: config.geoserverPort,
		method: 'POST'
	};
	//console.log("################ ### ### ### ### proxy.createLayerGroup options: ",options,"\n####### data:", data);
	conn.request(options, data, function(err, output, resl) {
		if(err){
			logger.error("\n\n------ LayerGroup not created! -------\n\nError:",err);
		}else if(!config.toggles.noGeoserverLayerGroups){
			//console.log("####### output: ", output);
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

/**
 * Made for testing purposes. Make POST request to /api/proxy/getSldMap to see sldMap
 * @param params
 * @param req
 * @param res
 * @param callback
 * @returns {*}
 */
function getSldMap(params, req, res, callback){
	res.data = sldMap;
	return callback(null);
}

/**
 * Made for testing purposes. Make POST request to /api/proxy/getSldMapTemp to see sldMapTemp
 * @param params
 * @param req
 * @param res
 * @param callback
 * @returns {*}
 */
function getSldMapTemp(params, req, res, callback){
	res.data = sldMapTemp;
	return callback(null);
}

function getSldSync(id) {
	return sldMap[id];
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
};


module.exports = {
	wms: wms,
	setJsid: setJsid,
	saveSld: saveSld,
	getSld: getSld,
	getSldMap: getSldMap,
	getSldMapTemp: getSldMapTemp,
	getSldSync: getSldSync,
	setSldTemp: setSldTemp,
	chartConfMap: chartConfMap
};


