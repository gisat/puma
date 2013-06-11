var errMap = {
    'cannotdelete': {
        status: 409,
        fn: function(req,errData) {
            var text = '';
            for (var i=0;i<errData.length;i++) {
                var data = errData[i];
                var keys = Object.keys(data.filter);
                text = text ? (text+'\n') : text;
                text += req.loc.get('alert.referror',[data.coll,data.names.join(','),keys.join(',')])
            }
            return text;
        }
    }
}

module.exports = {
    errMap: errMap
}

