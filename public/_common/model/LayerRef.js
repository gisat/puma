Ext.define('Puma.model.LayerRef', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','joinFidColumn','joinParentColumn','columnMap','location','layer','fidColumn','isData','nameColumn','codeColumn','parentColumn','areaTemplate','attributeSet','year','wmsAddress','wmsLayers','active','reuseYears'
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


