Ext.define('Puma.model.DataView', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','conf'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/dataview',
        extraParams: {
            justMine: true
        },
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


