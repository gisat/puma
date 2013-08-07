Ext.define('Puma.model.PerformedAnalysis', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','location','year','analysis','finished','dataset',
    'featureLayerTemplates', // spatialagg
    ],
    idProperty: '_id',
    proxy: {
        type: 'ajax',
        api: {
            create: Cnst.url+'/api/analysis/create',
            destroy: Cnst.url+'/api/analysis/remove',
            read: Cnst.url+'/rest/performedanalysis'
        },
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


