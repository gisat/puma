Ext.define('PumaMain.view.Tools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toolspanel',
    requires: ['PumaMain.view.LayerPanel'],
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
            maxHeight: 300
        }, {
            xtype: 'layerpanel',
            collapsed: true,
            height: 300,
            title: 'Layers'
        },{
            xtype: 'panel',
            collapsed: false,
            height: 150,
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


