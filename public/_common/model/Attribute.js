
Ext.define('Puma.model.Attribute', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','color','code','type','units','active','description'
    ],
    idProperty: '_id',
    proxy: {
        type: 'rest',
        url : Cnst.url+'/rest/attribute',
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


