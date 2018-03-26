let d3geo = require('d3-geo');
let wellknown = require('wellknown');

class BoundingBox {
    constructor(){
    }

    /**
     * Get complete bounding box from two corners.
     * @param corners {Array} Bottom-left and upper-right corner of the bounding box
     * @returns {Array} 4 definition points of the area represented by [lon,lat] coordinates
     */
    completeBoundingBox(corners){
        let points = [];

        let minLon = Number(corners[0][0]);
        let minLat = Number(corners[0][1]);
        let maxLon = Number(corners[1][0]);
        let maxLat = Number(corners[1][1]);
        points.push([minLon,minLat]);
        points.push([maxLon,minLat]);
        points.push([maxLon,maxLat]);
        points.push([minLon,maxLat]);
        return points;
    }

    /**
     * Calculate an extent for given geometry in GeoJSON
     * @param geometry {JSON}
     * @returns {Array} Bottom-left and upper-right corner of the bounding box
     */
    getExtentFromJSON(geometry){
        return d3geo.geoBounds(geometry);
    }

    /**
     * Calculate an extent for from a list of [lon,lat] points
     * @param points {Array}
     * @returns {Array}
     */
    getExtentFromPoints(points){
        let json = this.getGeoJsonFromPoints(points);
        return this.getExtentFromJSON(json);
    }

    /**
     * Get extent from WKT geometry
     * @param geometry {string} WKT geometry
     * @returns {Array} Bottom-left and upper-right corner of the bounding box
     */
    getExtentFromWkt(geometry){
        let json = wellknown(geometry);
        return this.getExtentFromJSON(json);
    }

    /**
     * It converts list of points [lon,lat] to GeoJSON structure
     * @param points {Array} list of points
     * @returns {JSON} GeoJSON
     */
    getGeoJsonFromPoints (points){
        let json = {
            "type": "FeatureCollection",
            "features": []
        };
        points.forEach(function(point){
            json["features"].push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": point
                }
            })
        });
        return json;
    };
}

module.exports = BoundingBox;