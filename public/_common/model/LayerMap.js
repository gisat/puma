Ext.define('Puma.model.LayerMap', {
    extend: 'Ext.data.Model',
    fields: [

        '_id','name','symbologies','areaTemplate','defVisible','bindAt'
    ],
    idProperty: '_id',
    proxy: 'memory'
});


