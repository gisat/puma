Ext.define('Puma.model.MappedChartAttribute', {
    extend: 'Ext.data.Model',
    fields: [

    'as','attr','normType','normAs','normAttr'
    ],
    idProperty: '_id',
    proxy: 'memory'
});


