Ext.define('Puma.model.MappedAttribute', {
    extend: 'Ext.data.Model',
    fields: [

    '_id','name','index','attribute','attributeSet'
    ],
    idProperty: '_id',
    proxy: 'memory'
});


