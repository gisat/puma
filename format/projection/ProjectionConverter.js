let proj4 = require('proj4');
let wellknown = require('wellknown');
let _ = require('lodash');

class ProjectionConverter {
    constructor() {
        this._krovakEastNorth = "+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs";
        this._wgs = "WGS84";
        this._shift = [-0.00007, -0.000075];
    }

    /**
     * Manually shift wrong coordinates of a point
     * todo remove this operation if original coordinates are correct
     * @param wgsPoint
     * @returns {Object} shifted coordinates
     */
    shiftCoordinates(wgsPoint){
        return {
            x: wgsPoint.x + this._shift[0],
            y: wgsPoint.y + this._shift[1]
        };
    }
    
    convertCoordinatesKrovakToWgs84(krovakCoordinates) {
        let wgs84Coordinates = [];
        krovakCoordinates.map(point => {
            let wgsPoint;
            // check the coordinates, if they are in WGS or Krovak East-North
            if (Math.abs(point.x) < 190) {
                wgsPoint = point;
            } else {
                wgsPoint = proj4(this._krovakEastNorth, this._wgs, point);
            }
            wgsPoint = this.shiftCoordinates(wgsPoint);
            wgs84Coordinates.push(wgsPoint);
        });
        
        return wgs84Coordinates;
    }
    
    convertWktKrovakToWgs84(krovakWkt) {
        let geojson = wellknown(krovakWkt);
        let convertedCoordinates = _.map(geojson.coordinates, coordinates => {
            return _.map(coordinates, coordinates => {
                if(coordinates[0] instanceof Array) {
                    return _.map(coordinates, coordinates => {
                        let convertedCoordinatesObject = this.convertCoordinatesKrovakToWgs84([{x: coordinates[0], y: coordinates[1]}]);
                        return [convertedCoordinatesObject[0].x, convertedCoordinatesObject[0].y];
                    })
                } else {
                    let convertedCoordinatesObject = this.convertCoordinatesKrovakToWgs84([{x: coordinates[0], y: coordinates[1]}]);
                    return [convertedCoordinatesObject[0].x, convertedCoordinatesObject[0].y];
                }
            })
        });
        geojson.coordinates = convertedCoordinates;
        return wellknown.stringify(geojson);
    }

    /**
     * Convert geometry in WKT from EPSG:4326 to EPSG:5514
     * @param wkt4326 {string} WKT geometry in EPSG:4326
     * @returns {string} WKT geometry in EPSG:5514
     */
    convertWktEpsg4326ToEpsg5514(wkt4326){
        let geojson = wellknown(wkt4326);
        let convertedCoordinates = _.map(geojson.coordinates, coordinates => {
            if(coordinates[0] instanceof Array) {
                return _.map(coordinates, coordinates => {
                    return proj4(this._wgs,this._krovakEastNorth,coordinates);
                })
            } else {
                return proj4(this._wgs,this._krovakEastNorth,coordinates);
            }
        });
        geojson.coordinates = convertedCoordinates;
        return wellknown.stringify(geojson);
    }
}

module.exports = ProjectionConverter;