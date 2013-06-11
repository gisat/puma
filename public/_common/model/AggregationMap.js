Ext.define('Puma.model.AggregationMap', {
    extend: 'Ext.data.Model',
    fields: [

    'attribute','attributeSet','type','calcAttributeSet','calcAttribute','normAttributeSet','normAttribute','groupVal'
    ],
    idProperty: 'attribute',
    proxy: 'memory'
});



