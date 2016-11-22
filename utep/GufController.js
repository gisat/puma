var conn = require('../common/conn');
var config = require('../config');
var superagent = require('superagent');
var crud = require('../rest/crud');

class GufController {
    constructor(app) {
        app.get('/utep/map-guf-75', this.map.bind(this, 'geonode:guf_75m_', 272));
        app.get('/utep/map-guf-28', this.map.bind(this, 'geonode:GUF28_', 25300));
        app.get('/utep/map-guf-10', this.map.bind(this, 'geonode:GUF10-', 25301));
    }

    map(name, templateId, request, response) {

        // Load from geonode all layers I have rights to.
        superagent
            .get(config.geonodePath + '/layers/acls')
            .set("Cookie", "sessionid=" + request.ssid || '')
            .then(layers => {
                var layerNames = layers.body.rw;
                var gufLayers = layerNames.filter(layerName => {
                    return layerName.indexOf(name) == 0
                });
                gufLayers.forEach(gufName => {
                    var layerRef = {
                        "layer": gufName,
                        "location": 4685,
                        "year": 307,
                        "active": true,
                        "areaTemplate": templateId,
                        "columnMap": [],
                        "isData": false
                    };
                    crud.create("layerref", [layerRef], {userId: 1}, function(){});

                });
                response.json({status: "Ok"})
            }).catch(error => {
            console.log(error);
        })
    }
}

module.exports = GufController;