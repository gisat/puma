
var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var dataMod = require('../data/data');

function getData(params,req,res,callback) {
    dataMod.getData(params,function(err,data) {
        if (err) return callback(err);
        res.data = data;
        return callback();
    })
    
    
    
}
module.exports = {
    getData: getData
}

