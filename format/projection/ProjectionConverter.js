let proj4 = require('proj4');
let wellknown = require('wellknown');
let _ = require('lodash');

class ProjectionConverter {
    constructor() {
        this._krovakEastNorth = "+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813975277778 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +units=m +no_defs";
        this._wgs = "WGS84";
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
            wgs84Coordinates.push(wgsPoint);
        });
        
        return wgs84Coordinates;
    }
    
    convertWktKrovakToWgs84(krovakWkt) {
        console.log(krovakWkt);
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
}

module.exports = ProjectionConverter;