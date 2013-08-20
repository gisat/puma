Ext.define('Puma.model.Analysis', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','type','areaTemplate','attributeSet','attributeMap','attributeSets','groupAttributeSet','groupAttribute','topics'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Config.url+'/rest/analysis',
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


