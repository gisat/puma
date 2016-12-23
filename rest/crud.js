var async = require('async');
var hookLib = require('./hooks');
var hooks = require('./models').hooks;
var ensureObj = require('./models').ensureIds;
var refs = require('./models').refs;
var conn = require('../common/conn');
var collections = require('./models').collections;
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('lodash');

function ensureCollection(req, res, next) {
    if (collections.indexOf(req.params.objType) != -1) {
        next();
    } else {
        logger.error("Given collection doesnt exist: ", req.params.objType, " User: ", req.userId);
        next(new Error('unknownCollection'));
    }
}


function create(collName, obj, params, callback) {
    logger.info("Create new item in collection: ", collName, " With data: ", obj, " and Params: ", params);
    if (typeof(params) === 'function') {
        callback = params; // TODO: get rid of this
        params = {};
        logger.warn("Create doesn't have enough parameters for collection: ", collName, " with data: ", obj, " and Params: ", params);
    }

    if (typeof obj == "string") {
        obj = JSON.parse(obj);
    }

    var db = conn.getMongoDb();
    var opts = {
        checkRefs: function (asyncCallback) {
            checkRefs(db, obj, collName, function (dependencies) {
                if (result instanceof Error) {
                    logger.error("crud#create. checkRefs Error: ", err);
                    return callback(err);
                }
                asyncCallback(null);
            });
        },
        createMissingDependencies: ['checkRefs', function (asyncCallback) {
            var map = refs[collName];
            var objs = Array.isArray(obj) ? obj : [obj];
            _.each(objs, object => {
                _.each(map, modelKey => {
                    let value = _.get(object, modelKey);
                    if (_.isObject(value)) {
                        // push into array
                    }
                });
            });
            //do async magic on array
            //create(modelKey.coll, value, params, callback);
        }],
        // from here on we only work with simple object, not array of
        preCreate: ['createMissingDependencies', function (asyncCallback) {
            obj['_id'] = conn.getNextId();
            ensureIds(obj, collName);
            var date = new Date();
            obj['created'] = date;
            obj['createdBy'] = params.userId;
            obj['changed'] = date;
            obj['changedBy'] = params.userId;
            if (params['bypassHooks']) {
                return asyncCallback(null);
            }
            doHooks("precreate", collName, obj, params, function (err, result) {
                if (err) {
                    logger.error("crud#create. preCreate Hooks Error: ", err);
                    return callback(err);
                }
                return asyncCallback(null);
            });
        }],
        create: ['preCreate', function (asyncCallback) {
            var collection = db.collection(collName);
            collection.insert(obj, function (err, result) {
                if (err) {
                    logger.error("crud#create. create Error: ", err);
                    return callback(err);
                }
                return asyncCallback(null, result.ops[0]);
            });
        }],
        hooks: ['create', function (asyncCallback, results) {
            if (params['bypassHooks']) {
                return callback(null, results.create);
            }
            doHooks("create", collName, results.create, params, function (err, result) {
                if (err) {
                    logger.error("crud#create. hooks Error: ", err);
                    return callback(err);
                }
                return callback(null, results.create);
            });
        }]
    };

    async.auto(opts);
}

/**
 * It returns collection restricted by either activeness of element or the person who created the element.
 * @param columnName {String} Name of one of the collections in the Mongo
 * @param params {Object} Parameters allowing further filtering.
 * @param callback {Function} Function called, when the operation ends. Either with result or with error object.
 */
function readRestricted(columnName, params, callback) {
    var filter;
    if (params.userId) {
        filter = {
            $or: [
                {active: true},
                {createdBy: params.userId}
            ]
        };
    } else {
        filter = {
            active: true
        };
    }

    read(columnName, filter, params, callback);
}

function read(collName, filter, params, callback) {
    if (typeof(params) === 'function') {
        callback = params; // todo get rid of this
        params = {};
        logger.warn("Read doesn't have enough parameters for collection: ", collName, " with filter: ", filter, " and Params: ", params);
    } else {
        logger.info("Read data from collection: ", collName, " With filter: ", filter, " and Params: ", params);
    }

    var db = conn.getMongoDb();
    var collection = db.collection(collName);

    if (params['justMine']) {
        filter['createdBy'] = params['userId'];
    }

    collection.find(filter).toArray(function (err, items) {
        callback(err, items);
    });
}

function update(collName, obj, params, callback, bypassHooks) {
    if (typeof(params) === 'function') {
        callback = params; // todo get rid of this
        params = {};
        logger.warn("Update doesn't have enough parameters for collection: ", collName, " with data: ", obj, " and Params: ", params);
    } else {
        logger.info("Update item in collection: ", collName, " With data: ", obj, " and Params: ", params);
    }

    if (typeof obj == "string") {
        obj = JSON.parse(obj);
    }

    var db = conn.getMongoDb();
    if (!canUpdate(collName, obj)) {
        logger.error("It wasn't possible to update collection: ", collName, " With data: ", obj, " and Params: ", params);
        return callback(new Error('cannotupdate'));
    }
    var collection = db.collection(collName);
    var filter = {
        "_id": obj['_id']
    };
    async.auto({
        checkRefs: function (asyncCallback) {
            checkRefs(db, obj, collName, function (err) {
                if (err) {
                    logger.error("crud#update. update checkRefs Error: ", err);
                    return callback(err);
                }
                asyncCallback(null);
            });
        },
        update: ['checkRefs', function (asyncCallback) {
            delete obj['_id'];
            obj['changed'] = new Date();
            obj['changedBy'] = params.userId;

            collection.update(filter, {'$set': obj}, {}, function (err) {
                if (err) {
                    logger.error("crud#update It wasn't possible to update collection: ", collName, " With Error: ", err);
                    return callback(err);
                }
                collection.findOne(filter, function (err, result) {
                    if (err) {
                        logger.error("crud#update It wasn't possible to find updated record: ", collName, " Filter: ", filter, " With Error: ", err);
                        return callback(err);
                    }
                    if (result == null) {
                        logger.error("crud#update It wasn't possible to find updated record: ", collName, " Filter: ", filter);
                        return callback(new Error("CRUD.update didn't find updated record. Probably user mismatch or not isAdmin. (former Weird error)"));
                    }
                    asyncCallback(null, result);
                });

            });
        }],
        hooks: ['update', function (asyncCallback, results) {
            doHooks("update", collName, results.update, params, function (err, result) {
                if (err) {
                    logger.error("crud#update hooks Error: ", err);
                    return callback(err);
                }
                return callback(null, results.update);
            });
        }]
    });
}

function remove(collName, filter, params, callback) {
    if (typeof(params) === 'function') {
        callback = params; // todo get rid of this
        params = {};
        logger.warn("Delete doesn't have enough parameters for collection: ", collName, " with filter: ", filter, " and Params: ", params);
    } else {
        logger.info("Delete data from collection: ", collName, " With filter: ", filter, " and Params: ", params);
    }

    if (typeof filter == "string") {
        filter = JSON.parse(filter);
    }

    var db = conn.getMongoDb();
    var collection = db.collection(collName);

    var opts = {
        checkRef: function (asyncCallback) {
            if (filter['_id']) {
                checkDeleteRefs(filter['_id'], collName, function (err) {
                    if (err) return callback(err);
                    return asyncCallback();
                });
            }
        },
        remove: ['checkRef', function (asyncCallback) {
            var filterRemoval = {_id: filter['_id']};
            collection.findAndRemove(filterRemoval, [], function (err, result) {
                if (err) {
                    logger.error("It wasn't possible to remove object: ", filter, " from collection: ", collName);
                    return callback(err);
                }
                return asyncCallback(null, result);
            });
        }],
        hooks: ['remove', function (asyncCallback, results) {
            if (!params['bypassHooks']) {
                doHooks("remove", collName, results.remove, params, function (err, result) {
                    if (err) {
                        logger.error("It wasn't possible to remove, when running hooks, object: ", filter, " from collection: ", collName);
                        return callback(err);
                    }
                    return callback(null, result);
                });
            } else {
                return callback(null, results.remove);
            }
        }]
    };

    async.auto(opts);
}

var canUpdate = function (collName, obj) {
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
};

var extract = function (objects, fieldName) {
    var extracted = [];
    for (var j = 0; j < objects.length; j++) {
        var subObjs = objects[j][fieldName];
        if (!subObjs) return [];
        subObjs = Array.isArray(subObjs) ? subObjs : [subObjs];
        extracted = extracted.concat(subObjs);
    }
    return extracted;
};


var ensureIds = function (obj, collName) {
    if (!ensureObj[collName]) return;
    var fields = ensureObj[collName].split('.');
    var objs = Array.isArray(obj) ? obj : [obj];


    for (var i = 0; i < fields.length; i++) {
        var newObjs = extract(objs, fields[i]);
        objs = newObjs;
    }
    for (var i = 0; i < objs.length; i++) {
        if (!objs[i]['_id']) {
            objs[i]['_id'] = conn.getNextId();
        }
    }
};

var checkRefs = function (db, obj, collName, callback) {
    if (!refs[collName]) {
        callback(null);
    }
    var map = refs[collName];
    var keys = [];
    for (var key in map) {
        keys.push(key);
    }

    let error;

    async.every(keys, function (key, asyncCallback) {
        var fields = key.split('.');
        var objs = Array.isArray(obj) ? obj : [obj];

        // for (var i=0;i<fields.length;i++) {
        // 	var newObjs = extract(objs,fields[i]);
        // 	objs = newObjs;
        // }
        for (let field of fields) {
            objs = extract(objs, field);
        }

        if (!objs.length || !objs[0]) {
            return asyncCallback(true);
        }
        // var noDuplicates = [];
        // var noDuplicatesMap = {};
        // for (var i=0;i<objs.length;i++) {
        // 	if (noDuplicatesMap[objs[i]]) continue;
        // 	noDuplicates.push(objs[i]);
        // 	noDuplicatesMap[objs[i]] = true;
        // }
        // objs = noDuplicates;
        objs = _.uniq(objs);

        var dependantCollName = map[key].coll;
        var collection = db.collection(dependantCollName);

        // remove dependencies yet to be created
        let refIDs = _.remove(objs, _.isObject);

        let filter = {_id: {$in: refIDs}};
        let length = refIDs.length;
        let error;

        logger.info("checkRefs collection ", dependantCollName, " count filter:", filter);
        logger.info("IDs: ", refIDs);

        collection.count(filter, function (err, result) {
            if (err) {
                logger.error("checkRefs err", err);
                error = err;
            } else if (result != length) {
                logger.error("checkRefs result != length (", result, "!=", length, ")");
                error = new Error("Non-existing refs found");
            }
        });
        asyncCallback(!error);

    }, function(result) {
        if (!result) {
            logger.error("It wasn't possible to check Reference.");
            return callback(new Error('referror'));
        } else {
            return callback(null);
        }
    });

};

var checkDeleteRefs = function (id, collName, callback) {
    var foundAttrs = [];
    for (var coll in refs) {
        var currentCollection = refs[coll];
        for (var attr in currentCollection) {
            var currentAttr = currentCollection[attr];
            if (currentAttr.coll == collName) {
                var filter = {};
                filter[attr] = id;
                var obj = {
                    coll: coll,
                    filter: filter
                };
                foundAttrs.push(obj);
            }
        }
    }
    async.mapSeries(foundAttrs, function (item, asyncCallback) {
        read(item.coll, item.filter, function (err, items) {
            if (err) return asyncCallback(err);
            if (!items.length) {
                return asyncCallback(null, null)
            } else {
                var ids = [];
                var names = [];
                for (var i = 0; i < items.length; i++) {
                    ids.push(items[i]['_id']);
                    names.push(items[i]['name']);
                }
                var obj = {ids: ids, coll: item.coll, filter: item.filter, names: names};
                return asyncCallback(null, obj);
            }
        });
    }, function (err, results) {
        if (err) callback(err);
        var errData = [];
        for (var i = 0; i < results.length; i++) {
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
    });
};


var doHooks = function (opType, collName, result, params, callback) {
    var hook = hooks[collName] ? hooks[collName][opType] : null;

    if (hook) {
        hookLib[hook](result, callback, params);
    } else {
        return callback(null, result);
    }
};

var doPreHooks = function (opType, collName, obj, callback) {

};

module.exports = {
    create: create,
    read: read,
    readRestricted: readRestricted,
    update: update,
    remove: remove,
    ensureCollection: ensureCollection
};
