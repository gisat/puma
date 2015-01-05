var path = require('path');
var fs = require('fs');
var cp = require('child_process');
var async = require('async');
var config = require('../config');

function uploadTable(params,req,res,callback) {
    
    var name = req.files.file.path;
    var dir = path.dirname(name)
    var baseName = path.basename(name);
    var extName = path.extname(name);
    
    async.series([
        function(asyncCallback) {
            var base = baseName.split(extName)[0];
            var fileName = name;
            var cmd = '$0 -f PostgreSQL $1 $2 -nln $3 -lco SCHEMA=import'
            cmd = cmd.replace('$0',config.ogrPath).replace('$1',config.ogrConn).replace('$2',fileName).replace('$3',params['tablename'])
            console.log(cmd)
            cp.exec(cmd, {maxBuffer:1024*1024*1000},function(err, stdout, stderr) {
                if (err) return asyncCallback(err);
                if (stderr) return asyncCallback(new Error(stderr));
                return asyncCallback(null)
            })
            
        },
        function(asyncCallback) {
            asyncCallback();
            fs.unlink(name,function(){});
        }
    ],callback)
    
}

function uploadRefTable(params,req,res,callback) {
    
    var name = req.files.file.path;
    var dir = path.dirname(name)
    var baseName = path.basename(name);
    var extName = path.extname(name);
    
    async.series([
        function(asyncCallback) {
            var base = baseName.split(extName)[0];
            var fileName = name;
            var cmd = '$0 -f PostgreSQL $1 $2 -nln $3 -overwrite -lco PRECISION=no'
            cmd = cmd.replace('$0',config.ogrPath).replace('$1',config.ogrConn).replace('$2',fileName).replace('$3','refimport.ref')
            console.log(cmd)
            cp.exec(cmd, {maxBuffer:1024*1024*1000},function(err, stdout, stderr) {
                if (err) return asyncCallback(err);
                if (stderr) return asyncCallback(new Error(stderr));
                return asyncCallback(null)
            })
            
        },
        function(asyncCallback) {
            asyncCallback();
            fs.unlink(name,function(){});
        }
    ],callback)
    
}
module.exports = {
    uploadTable: uploadTable,
    uploadRefTable: uploadRefTable
}


