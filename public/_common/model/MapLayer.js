Ext.define('Puma.model.MapLayer', {
    extend: 'Ext.data.TreeModel',
    fields: [

    'name','layer','layerName','symbologyId','yearsAvailable','allowOnlyOne','groupName','areaTemplate','wmsAddress','wmsLayers','initialized','at','bindAt','bindChart','sldId'
    ],
    idProperty: 'id',
    proxy: 'memory'
});


