Ext.define('Puma.model.Aggregated', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name'
    ],
    idProperty: '_id',
    proxy: 'memory'
});


