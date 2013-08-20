
Ext.define('Puma.model.Symbology', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','symbologyName','active','topic'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/symbology',
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


