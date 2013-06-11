function initDom(callback) {
    require('jsdom').env('<html><body></body></html>', function(errors, window) {

//        if (errors) {
//            callback(errors);
//        }
//        GLOBAL.DOMParser = require('xmldom').DOMParser;
//        for (var i in window) {
//            if (i == "console") {
//                continue;
//            }
//            eval("GLOBAL." + i + "=window['" + i + "'];");
//        }
//        GLOBAL.document = require('xmldom').document;
        
        //console.log(document.createElementNS);
        
        callback();
    })
}

module.exports = {
    initDom: initDom
}


