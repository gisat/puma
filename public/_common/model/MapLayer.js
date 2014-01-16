Ext.define('Puma.model.MapLayer', {
    extend: 'Ext.data.TreeModel',
    fields: [

        'name','layer1','layer2','symbologyId','at','bindChart','checked','attribute','attributeSet',
        'type','topic','params','src','sortIndex','cfg','legend','layerGroup','priority',
        {
            name: 'atWithSymbology',
            convert: function(val,rec) {
                return rec.get('at')+'_'+rec.get('symbologyId')
            }
        }
    ],
    idProperty: 'id',
    proxy: 'memory'
});


