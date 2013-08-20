Ext.define('Puma.model.Year', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','active'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/year',
        reader: {
            type: 'json',
            root: 'data'
        },
        writer: {
            type: 'json',
            writeAllFields: false,
            root: 'data'
        }
    }
});


