var jsdom = require("jsdom");
var fs = require("fs");
var refPage = fs.readFileSync('public/index.html');

function execInDom(callback) {
    require('jsdom').env('http://192.168.2.196:3000/public/index.html', function(errors, window) {

            if (errors) {
                callback(errors);
            }
            GLOBAL.DOMParser = require('xmldom').DOMParser;
            GLOBAL.XMLSerializer = require('xmldom').XMLSerializer;
            //GLOBAL.document = require('xmldom').Document;
            for (var i in window) {
                if (i == "console") {
                    continue;
                }
                eval("GLOBAL." + i + "=window['" + i + "'];");
            }
            return callback();
        })
}

module.exports = {
    execInDom: execInDom
}


