


var async = require('async');
var us = require('underscore');
var hookLib = require('./hooks');
var hooks = require('./models').hooks;
var ensureObj = require('./models').ensureIds;
var refs = require('./models').refs;
var conn = require('../common/conn');
var collections = require('./models').collections;
var ObjectID = require('mongodb').ObjectID;

function ensureCollection(req,res,next) {
    if (collections.indexOf(req.params.objType)!=-1) {
        next();
    }
    else {
        next(new Error('unknownCollection'));            
    }
}


function create(collName,obj,params,callback) {
    if (typeof(params) === 'function') callback = params;
    
    var db = conn.getMongoDb();
    var opts = {
        checkRefs: function(asyncCallback) {
            checkRefs(obj,collName,function(err) {
                if (err) return callback(err);
                asyncCallback(null);
            });
        },
        preCreate: ['checkRefs',function(asyncCallback) {
            obj['_id'] = conn.getNextId();
            ensureIds(obj,collName);
            var date = new Date();
            obj['created'] = date;
            obj['createdBy'] = params.userId;
            obj['changed'] = date;
            obj['changedBy'] = params.userId;
            if (params['bypassHooks']) {
                return asyncCallback(null);
            }
            doHooks("precreate",collName,obj,params,function(err,result) {
                if (err) return callback(err);
                return asyncCallback(null);
            });
        }],
        create: ['preCreate',function(asyncCallback) {
            var collection = db.collection(collName);
            collection.insert(obj,function(err,result) {
                if (err) return callback(err)
                return asyncCallback(null,result[0]);
            });
        }],
        hooks: ['create', function(asyncCallback,results) {
            if (params['bypassHooks']) {
                return callback(null,results.create);
            }
            
                
   
            doHooks("create",collName,results.create,params,function(err,result) {
                if (err) return callback(err);
                
                return callback(null,results.create)
            });
        }]
    }
    
    async.auto(opts);      
}


function read(collName,filter,params,callback) {
    if (typeof(params) === 'function') callback = params;
    
    var db = conn.getMongoDb();
    var collection = db.collection(collName);
    if (params['justMine']) {
        filter['createdBy'] = params['userId']
    }
    
    collection.find(filter).toArray(function(err,items) {
        if (collName=='attribute') {
            var sorter = [429,1125];
            items = us.sortBy(items,function(item) {
                var idx = us.indexOf(sorter,item._id)
                return idx>-1 ? idx : 99999;
            })
        }
        callback(err,items)
    });
}

function update(collName, obj, params, callback,bypassHooks) {
    
    if (typeof(params) === 'function')
        callback = params;
    var db = conn.getMongoDb();
    if (!canUpdate(collName, obj)) {
        return callback(new Error('cannotupdate'));
    }
    var collection = db.collection(collName);
    debugger;
    var filter = {
        "_id": obj['_id']
    }
    if (!params.isAdmin) {
        filter['createdBy'] = params.userId;
    }
    var opts = {
        checkRefs: function(asyncCallback) {
            checkRefs(obj,collName,function(err) {
                if (err) return callback(err);
                asyncCallback(null);
            });
        },
        update: ['checkRefs',function(asyncCallback) {
            delete obj['_id']
            obj['changed'] = new Date();
            obj['changedBy'] = params.userId;
            collection.update(filter, {'$set': obj}, {}, function(err) {
                if (err)
                    return callback(err);
                collection.findOne(filter, function(err, result) {
                    if (err)
                        return callback(err);
                    asyncCallback(null, result)
                })

            })
        }],
        hooks: ['update', function(asyncCallback,results) {
            doHooks("update",collName,results.update,params,function(err,result) {
                if (err) return callback(err);
                return callback(null,results.update)
            });
        }]
    }
    
    async.auto(opts);

}

function remove(collName,filter,params,callback) {
    if (typeof(params) === 'function') callback = params;
    var db = conn.getMongoDb();
    var collection = db.collection(collName);
    
    if (!params.isAdmin) {
        filter['createdBy'] = params.userId;
    }
    var opts = {
        checkRef: function(asyncCallback) {
            if (filter['_id']) {
                checkDeleteRefs(filter['_id'],collName,function(err) {
                    if (err) return callback(err);
                    return asyncCallback();
                })
            }
        },
        remove: ['checkRef',function(asyncCallback) {
            var collection = db.collection(collName);
            
            collection.findAndRemove(filter, [], function(err, result) {
                if (err)
                    return callback(err);
                
                return asyncCallback(null, result);
            });
        }],
        hooks: ['remove', function(asyncCallback, results) {
                if (!params['bypassHooks']) {
                    doHooks("remove", collName, results.remove, params, function(err, result) {
                        if (err)
                            return callback(err);
                        return callback(null, result);
                    });
                }
                else {
                    return callback(null,results.remove);
                }
            }]
    }
    
    async.auto(opts);   
}

var canUpdate = function(collName,obj) {
    if (!refs[collName]) {
        return true;
    }
    
    var map = refs[collName];
    for (var key in map) {
        var canUpdate = map[key].canUpdate;
        if (canUpdate === false && obj[key]) {
            return false;
        }
    }
    return true;
}

var extract = function (objects,fieldName) {
        var extracted = [];
        for (var j=0;j<objects.length;j++) {
            var subObjs = objects[j][fieldName]
            if (!subObjs) return [];
            subObjs = Array.isArray(subObjs) ? subObjs : [subObjs];
            extracted = extracted.concat(subObjs);
        }
        return extracted;
    }


var ensureIds = function(obj,collName) {
    if (!ensureObj[collName]) return;
    var fields = ensureObj[collName].split('.');
    var objs = Array.isArray(obj) ? obj : [obj];
    
        
    for (var i=0;i<fields.length;i++) {
        var newObjs = extract(objs,fields[i]);
        objs = newObjs;
    }
    for (var i=0;i<objs.length;i++) {
        if (!objs[i]['_id']) {
            objs[i]['_id']=conn.getNextId();
        }
    }     
}

var checkRefs = function(obj,collName,callback) {
    if (!refs[collName]) {
        callback(null);
    }
    var db = conn.getMongoDb();
    var map = refs[collName];
    var keys = [];
    for (var key in map) {
        keys.push(key);
    }
    async.every(keys,function(key,asyncCallback) {
        var fields = key.split('.');
        var objs = Array.isArray(obj) ? obj : [obj];
        
        for (var i=0;i<fields.length;i++) {
            var newObjs = extract(objs,fields[i]);
            objs = newObjs;
        }
        if (!objs.length || !objs[0]) {
            return asyncCallback(true);
        }
        var noDuplicates = [];
        var noDuplicatesMap = {};
        for (var i=0;i<objs.length;i++) {
            if (noDuplicatesMap[objs[i]]) continue;
            noDuplicates.push(objs[i]);
            noDuplicatesMap[objs[i]] = true;
        }
        objs = noDuplicates;
        
        var dependantCollName = map[key].coll;
        var collection = db.collection(dependantCollName);
        var filter = {_id: {$in: objs}}
        var length = objs.length;
        collection.count(filter,function(err,result) {
            if (err) return asyncCallback(false);
            if (result == length) {
                return asyncCallback(true);
            }
            else {
                return asyncCallback(false);
            }
        });
    },function(result) {
        if (!result) return callback(new Error('referror'))
        else return callback(null);
    })

}

var checkDeleteRefs = function(id,collName,callback) {
    var foundAttrs = [];
    for (var coll in refs) {
        var currentCollection = refs[coll]
        for (var attr in currentCollection) {
            var currentAttr = currentCollection[attr];
            if (currentAttr.coll == collName) {
                var filter = {};
                filter[attr] = id;
                var obj = {
                    coll: coll,
                    filter: filter
                }
                foundAttrs.push(obj);
            }
        }
    }
    async.mapSeries(foundAttrs,function(item,asyncCallback) {
        read(item.coll,item.filter,function(err,items) {
            if (err) return asyncCallback(err);
            if (!items.length) {
                return asyncCallback(null,null)
            }
            else {
                var ids = [];
                var names = [];
                for (var i=0;i<items.length;i++) {
                    ids.push(items[i]['_id']);
                    names.push(items[i]['name']);
                }
                var obj = {ids: ids, coll: item.coll, filter: item.filter, names: names}
                return asyncCallback(null, obj);
            }
        })
    }
    ,function(err,results) {
        if (err) callback(err);
        var errData = [];
        for (var i=0;i<results.length;i++) {
            var result = results[i];
            if (!result) continue;
            errData.push(result);
        }
        if (errData.length) {
            var newErr = new Error('cannotdelete');
            newErr.errData = errData;
            newErr.status = 409;
            return callback(newErr);
        }
        return callback();
    })
}


var doHooks = function(opType,collName,result,params,callback) {   
    var hook = hooks[collName] ? hooks[collName][opType] : null;
    //console.log(opType,collName,result);
    
    if (hook) {
        hookLib[hook](result,callback,params);
    }
    else {
        return callback(null,result)
    }
}

var doPreHooks = function(opType,collName,obj,callback) {
    
}

module.exports = {
    create: create,
    read: read,
    update: update,
    remove: remove,
    ensureCollection: ensureCollection
}


