Ext.define('PumaMain.view.Tools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toolspanel',
    // to be removed
    width: '100%',
    requires: ['PumaMain.view.LayerPanel','PumaMain.view.MapTools'],
    initComponent: function() {
        this.layout = {
            type: 'accordion',
            fill: false
            //,
            //multi: true
        }   
        this.items = [{
            xtype: 'panel',
            collapsed: true,
            height: 80,
            title: 'Select color',
            bodyCls: 'tools-colorpicker',
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
            itemId: 'areatree',
            store: Ext.StoreMgr.lookup('area'),
            selModel: {
                mode: 'MULTI'
            },
            rootVisible: false,
            displayField: 'name',
            height: 580
        }, {
            xtype: 'layerpanel',
            collapsed: true,
            height: 580,
            title: 'Layers'
        },{
            xtype: 'maptools',
            collapsed: false,
            title: 'Map tools'
        },{
            xtype: 'panel',
            collapsed: true,
            layout: {
                type: 'vbox',
                align: 'stretch'
                
            },
            itemId: 'advancedfilters',
            buttons: [{
            text: 'Configure',
            itemId: 'configurefilters'
            }],
            title: 'Advanced filters',
            bodyCls: 'tools-filters-list'
        }]
        
        this.callParent();
        
    }
})


