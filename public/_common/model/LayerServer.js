Ext.define('Puma.model.LayerServer', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','referenced','isWms'
    ],
    idProperty: '_id',
    proxy: {
        type: 'ajax',
        actionMethods: {create: 'POST', read: 'POST', update: 'POST', destroy: 'POST'},
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


