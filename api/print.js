


var cp = require('child_process');
var fs = require('fs');

function exporter(params, req, res, callback) {
    var fullUrl = req.protocol + "://" + req.get('host') + req.url;
    var url = fullUrl.replace(params.download ? 'print' : 'image', 'public');
    var imgId = 'snap_' + generateId() + '.png'
    var outFile = 'tmp/' + imgId;
    cp.execFile('phantomjs.exe', ['rasterize.js', url, outFile, '-', 1], {}, function(err, stdout, stderr) {
        if (params['download']) {
            res.downFile = [outFile, imgId]
            return callback(err);
        }
        else {
            
            fs.readFile(outFile, function(err, data) {
                if (err)
                    return callback(err);
                res.data = data;
                res.contType = 'image/png';
                res.encType = 'utf8';
                res.set('Cache-Control','max-age=60000000')
                callback()
                fs.unlink(outFile);
            })
        }
    })
}

var generateId = function() {
    var time = new Date().getTime();
    var random = Math.round(Math.random() * 100000000);
    var id = time.toString(32) + random.toString(32);
    return id;
}

module.exports = {
    exporter: exporter
}


