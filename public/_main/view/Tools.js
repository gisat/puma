Ext.define('PumaMain.view.Tools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toolspanel',
    // to be removed
    width: 380,
    requires: ['PumaMain.view.LayerPanel','PumaMain.view.MapTools'],
    initComponent: function() {
        this.layout = {
            type: 'accordion',
            fill: false,
            
        }   
        this.items = [{
            xtype: 'panel',
            collapsed: true,
            height: 46,
            title: 'Select color',
            items: [{
                    xtype: 'colorpicker',
                    fieldLabel: 'CP',
                    value: 'ff0000',
                    itemId: 'selectcolorpicker',
                    height: 20,
                    width: 120,
                    colors: ['ff0000', '00ff00', '0000ff', 'ffff00', '00ffff', 'ff00ff']
                }]
        }, {
            xtype: 'treepanel',
            title: 'Areas',
            height: 46,
            itemId: 'areatree',
            store: Ext.StoreMgr.lookup('area'),
            selModel: {
                mode: 'MULTI'
            },
            rootVisible: false,
            displayField: 'name',
            height: 600
        }, {
            xtype: 'layerpanel',
            collapsed: true,
            height: 600,
            title: 'Layers'
        },{
            xtype: 'maptools',
            collapsed: false,
            title: 'Map tools'
        },{
            xtype: 'panel',
            collapsed: true,
            height: 100,
            title: 'Advanced filters'
        }]
        
        this.callParent();
        
    }
})


