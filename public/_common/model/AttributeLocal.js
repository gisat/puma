Ext.define('Puma.model.AttributeLocal', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','color','code','type'
    ],
    idProperty: '_id',
    proxy: 'memory'
});


