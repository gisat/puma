Ext.define('Puma.model.Theme', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','active','topics'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/theme',
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


