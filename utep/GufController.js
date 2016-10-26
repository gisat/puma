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
                    [4,8,9,10,23,25,29,899,900,903,904,917,922,923,925,928,932,933,935,936,939,940,943,944,945,947,949,952,954,956,957,958,960,962,25,965,968,970,975,4685].forEach(location => {
                        var layerRef = {
                            "layer": gufName,
                            "location": location,
                            "year": 307,
                            "areaTemplate": 272,
                            "isData": false
                        };
                        crud.remove("layerref", layerRef, {userId: 1}, function(){});
                    });
                });
                response.json({status: "Ok"})
            }).catch(error => {
            console.log(error);
        })
    }
}

module.exports = GufController;