Ext.define('Puma.model.LayerGroup', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','active','priority'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/layergroup',
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


