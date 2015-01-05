Ext.define('Puma.model.Visualization', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','attrSet','columnAttrs','scatterAttrs','choroAttr','layers','dotChart'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/visualization',
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


