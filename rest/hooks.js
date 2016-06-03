var geoserverLayers = require('../geoserver/layers');


function precreateLayerRef(result, callback, params) {
	if (!result.fidColumn) return callback(null);
	geoserverLayers.checkUniqueId(result, function(err) {
		if (err) {
			return callback(err);
		}
		callback(null);
	})

}

function createLayerRef(result, callback, params) {
	var apiLayers = require('../api/layers');
	//console.log('moretimes');
	var async = require('async');
	async.waterfall([


		function(asyncCallback) {
			apiLayers.activateLayerRef({obj: result,justPerform: true}, {userId: params.userId, isAdmin:params.isAdmin}, null, function(err) {
				if (err){
					return callback(err);
				}
				return asyncCallback(null);
			});
		},
		function(asyncCallback) {
			//console.log('start recreating')
			if (!result.fidColumn) {
				return callback(null, result);
			}
			var crud = require('./crud');
			geoserverLayers.recreateLayerDb(result, false, function(err,baseLayerRef) {
				if (err) {
					crud.remove('layerref',{_id:result._id},{bypassHooks:true,userId: params.userId, isAdmin:params.isAdmin},function(err2,res) {

						if (err2){
							return callback(err2);
						}

						return callback(err);
					});
					return;
				} else {
					asyncCallback(null,baseLayerRef);
				}
			})
		},
		function(baseLayerRef,asyncCallback) {
			geoserverLayers.changeLayerGeoserver(result.isData ? baseLayerRef['_id'] : result['_id'], result.isData ? 'PUT' : 'POST', function(err) {
				if (err) {
					return callback(err);
				}
				return callback(null, result);
			});
		}
	]);

}

function updateLayerRef(result, callback) {
	if (!result.fidColumn) {
		return callback(null, result);
	}

	geoserverLayers.recreateLayerDb(result, true, function(err,baseLayerRef) {
		if (err) {
			return callback(err);
		}
		geoserverLayers.changeLayerGeoserver(result.isData ? baseLayerRef['_id'] : result['_id'], 'PUT', function(err) {
			if (err) {
				return callback(err);
			}
			return callback(null, result);
		});
	});
}



function removeLayerRef(result, callback, params) {
	if (!result.isData && result.fidColumn) {
		result.toBeDeleted = true;
	}
	var apiLayers = require('../api/layers');
	var async = require('async');
	async.waterfall([
		function(asyncCallback) {
			apiLayers.activateLayerRef({obj: result,justPerform: true,activateAnother:true}, {userId: params.userId, isAdmin:params.isAdmin}, null, function(err) {
				if (err) return callback(err);
				return asyncCallback(null);
			});
		},
		function(asyncCallback) {
			if (!result.fidColumn) {
				return callback(null);
			}
			geoserverLayers.recreateLayerDb(result, false, function(err,baseLayerRef) {
				if (err) {
					return callback(err);
				}
				asyncCallback(null,baseLayerRef);
			});
		},
		function(baseLayerRef,asyncCallback) {
			//console.log(baseLayerRef)
			geoserverLayers.changeLayerGeoserver(result.isData ? baseLayerRef['_id'] : result['_id'], result.isData ? 'PUT' : 'DELETE', function(err) {
				if (err) {
					return callback(err);
				}
				return callback(null, result);
			});
		}
	]);

}

module.exports = {
	createLayerRef: createLayerRef,
	precreateLayerRef: precreateLayerRef,
	updateLayerRef: updateLayerRef,
	removeLayerRef: removeLayerRef
};

