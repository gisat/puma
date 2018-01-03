var Promise = require('promise');
var conn = require('../common/conn');

class MongoAuditedInstance {
    constructor(instance) {
        if(!instance) {
            throw new Error('It isn\'t valid to create empty instance.');
        }

        this._instance = instance;

        if(!instance._id) {
            instance._id = conn.getNextId();
        }
    }

    json(userId) {
        var instance = this._instance;
        if(!instance.created || !instance.createdBy) {
            instance.created = new Date();
            instance.createdBy = userId;
        }

        instance.changed = new Date();
        instance.changedBy = userId;

        return Promise.resolve(instance);
    }
}

module.exports = MongoAuditedInstance;