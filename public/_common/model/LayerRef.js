Ext.define('Puma.model.LayerRef', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','columnMap','location','layer','fidColumn','isData','nameColumn','parentColumn','areaTemplate','attributeSet','year','wmsAddress','wmsLayers','active'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        timeout: 120000,
        url : Config.url+'/rest/layerref',
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


