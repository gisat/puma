var conn = require('../common/conn');
var config = require('../config');
var superagent = require('superagent');
var crud = require('../rest/crud');

class GufController {
    constructor(app) {
        app.get('/utep/map-guf', this.map.bind(this))
    }

    map(request, response) {

        // Load from geonode all layers I have rights to.
        superagent
            .get(config.geonodePath + '/layers/acls')
            .set("Cookie", "sessionid=" + request.ssid || '')
            .then(layers => {
                var layerNames = layers.body.rw;
                var gufLayers = layerNames.filter(layerName => {
                    return layerName.indexOf('geonode:guf_75m_') == 0
                });
                gufLayers.forEach(gufName => {
                    [4685].forEach(location => {
                        var layerRef = {
                            "layer": gufName,
                            "location": location,
                            "year": 307,
                            "areaTemplate": 272,
                            "isData": false
                        };
                        crud.create("layerref", [layerRef], {userId: 1}, function(){});
                    });
                });
                response.json({status: "Ok"})
            }).catch(error => {
            console.log(error);
        })
    }
}

module.exports = GufController;