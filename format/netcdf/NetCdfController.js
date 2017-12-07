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

        var data = file.root.subgroups.Surface.variables.T2M.readSlice(0,1,0,121,0,121);
        response.json({data: data});
    }
}

module.exports = NetCdfController;