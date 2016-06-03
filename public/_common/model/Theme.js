Ext.define('Puma.model.Theme', {
    extend: 'Ext.data.Model',
    fields: [
        //removed unused analysis, minFeatureLayer and minAttributeSets. Jonas
        //'_id','name','active','years','dataset','analysis','prefTopics','topics','minFeatureLayer','minAttributeSets','visOrder'
        '_id','name','active','years','dataset','prefTopics','topics','visOrder'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/theme',
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


