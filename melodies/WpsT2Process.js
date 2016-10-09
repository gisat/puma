var superagent = require('superagent');
var utils = require('utils');
var Promise = require('promise');

// TODO: Zitra namapovat informace na lu jednotky z ostatnich vrstev z IPRu.

// WPS proces zprovoznim asi spise az o vikendu. Zitra je primarni doer

class WpsT2Process {
    constructor() {
        this.id = null;
    }

    id() {
        return Promise.resolve(this.id);
    }

    start(processToStart) {
        return superagent
            .get('http://10.15.27.32:8080/wps/WebProcessingService')
            .query({service: "wps"})
            .query({version: "1.0.0"})
            .query({request: "Execute"})
            .query({identifier: "com.terradue.wps_oozie.process.OozieAbstractAlgorithm"})
            .query({"ResponseDocument": "result_distribution@application/xml;result_osd@application/xml"})
            .query({storeExecuteResponse: true})
            .query({status: true})
            .query({dataInputs: `region=${processToStart.name}};start=${processToStart.from}-01-01;end=${processToStart.to}-12-31;lcm=1000;xres=20;yres=20;validpixels=70;ndvi=130;ndwi=100;confidence=50;`})
            .set('Accept', 'text/xml')
            .end()
            .then(function(response){
                // Zparsovat ziskane XML.

            });
    }

    status() {
        return this.id().then(function(id){
            superagent
                .get('http://sb-10-15-27-32.melodies.terradue.int:8080/wps/RetrieveResultServlet')
                .query('id', 'a61fa79a-a4b8-43ac-85c7-055ae8f665bc')
                .set('Accept', '*/*')
                .end()
                .then(function(error, response){

            })
        })
    }
}

module.exports = WpsT2Process;