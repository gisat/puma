Ext.define('Puma.model.Scope', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','active','datasets'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/scope',
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


