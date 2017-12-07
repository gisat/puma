let gdal = require('gdal');
let netcdf4 = require('netcdf4');

class NetCdfController {
    constructor(app) {
        app.get('/rest/netcdf/data', this.readData.bind(this));
    }

    readData(request, response){
        let file = new netcdf4.File("/tmp/UrbClim_output_Prague_2011.nc", "r");

        console.log(file.root.subgroups.Surface.variables.T2M.dimensions[0].length);

        console.log(file.root.subgroups.Surface.variables.T2M.dimensions[1].length); // xy
        console.log(file.root.subgroups.Surface.variables.T2M.dimensions[2].length); // xz

        let data = file.root.subgroups.Surface.variables.T2M.readSlice(0,1,0,121,0,121);

        let bbox = this.bboxForGeoTiff();
        response.json({bbox: bbox, data: data});
    }

    bboxForGeoTiff() {
        let dataset = gdal.open('/tmp/Prague_UHI_geotiff.tif');
        let geoTransform = dataset.geoTransform;

        let numX = dataset.rasterSize.x;
        let numY = dataset.rasterSize.y;

        let minX = geoTransform[0];
        let minY = geoTransform[3] + (geoTransform[5] * numY);
        let maxX = geoTransform[0] + (geoTransform[1] * numX);
        let maxY = geoTransform[3];

        return `${minX},${minY},${maxX},${maxY}`;
    }
}

module.exports = NetCdfController;