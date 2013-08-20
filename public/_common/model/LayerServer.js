Ext.define('Puma.model.LayerServer', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','referenced','isWms'
    ],
    idProperty: '_id',
    proxy: {
        type: 'ajax',
        url : Config.url+'/api/layers/getLayers',
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


