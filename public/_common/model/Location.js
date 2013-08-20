
Ext.define('Puma.model.Location', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','bbox','center','active','dataset'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/location',
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


