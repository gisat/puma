Ext.define('Puma.model.DatasetLayerFilters', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','dataset','featureLayer','filters'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/datasetlayerfilters',
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



