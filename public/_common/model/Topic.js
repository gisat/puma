Ext.define('Puma.model.Topic', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','active'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Cnst.url+'/rest/topic',
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


