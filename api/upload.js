var conn = require('../common/conn');

function uploadTable(params,req,res,callback) {
    var path = req.files['table'].path;
    var sql = 'COPY testtable FROM '+path+' DELIMITER , CSV;';
    
    
}
module.exports = {
    uploadTable: uploadTable
}


