Ext.define('Puma.model.ColumnMap', {
    extend: 'Ext.data.Model',
    fields: [

    'column','attribute'
    ],
    idProperty: 'attribute',
    proxy: 'memory'
});


