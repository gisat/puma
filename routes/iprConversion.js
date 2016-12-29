var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');
var wellknown = require('wellknown');
var proj4 = require('proj4');

class iprConversion {
    constructor (app) {
        app.post("/iprconversion/krovak2wgs", this.conversion.bind(this));

        this._krovakEastNorth = "+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs";
        this._wgs = "WGS84";
    }

    /**
     * Convert (if it is necessary) WKT Geometry in Krovak Eest-North coordinates to a list of WGS-84 coordinates
     * Sometimes are already the coordinates in WGS84
     * @param req
     * @param res
     */
    conversion(req, res){
        let geometry = req.body.geometry;
        logger.info(`INFO iprConversion#conversion geom: ` + geometry);

        let geojson = wellknown(geometry);
        let krovakCoord = geojson.coordinates[0][0];
        logger.info(`INFO iprConversion#conversion krovakCoord: ` + krovakCoord);

        let wgsCoord = [];
        krovakCoord.map(point => {
            var wgsPoint;

            // check the coordinates, if they are in WGS or Krovak East-North
            if (Math.abs(point[0]) < 1000){
                wgsPoint = point;
            } else {
                wgsPoint = proj4(this._krovakEastNorth, this._wgs, point);
            }
            logger.info(`INFO iprConversion#conversion conversion: ` + point + ` => ` + wgsPoint);
            wgsCoord.push(wgsPoint);
        });
        res.send({
            status: "OK",
            data: wgsCoord
        });
    }
}

module.exports = iprConversion;