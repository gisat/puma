
Ext.define('Puma.model.AttributeSet', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','attributes','active','description','topic','featureLayers'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/attributeset',
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


