Ext.define('Puma.model.MappedChartAttribute', {
    extend: 'Ext.data.Model',
    fields: [

    'as','attr','normType','normAs','normAttr','normYear','attrName','attrNameNormalized','asName','checked','numCategories','classType','zeroesAsNull',
    {
        name: 'attrName',
        convert: function(value,record) {
            var attrStore = Ext.StoreMgr.lookup('attribute');
            var attr = attrStore.getById(record.get('attr'));
            return attr.get('name');
        }
    },
    {
        name: 'asName',
        convert: function(value,record) {
            var attrSetStore = Ext.StoreMgr.lookup('attributeset');
            var attrSet = attrSetStore.getById(record.get('as'));
            return attrSet.get('name');
        }
    }
    ],
    idProperty: '_id',
    proxy: 'memory'
});


