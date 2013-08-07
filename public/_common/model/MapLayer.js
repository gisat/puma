Ext.define('Puma.model.MapLayer', {
    extend: 'Ext.data.TreeModel',
    fields: [

        'name','layer1','layer2','symbologyId','at','bindChart','checked','attribute','attributeSet','type','topic','params','src','sortIndex'
    ],
    idProperty: 'id',
    proxy: 'memory'
});


