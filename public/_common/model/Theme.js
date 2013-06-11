Ext.define('Puma.model.Theme', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','active','years','dataset','analysis','topics','minFeatureLayer','minAttributeSets'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Cnst.url+'/rest/theme',
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


