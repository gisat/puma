Ext.define('PumaMain.view.Tools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toolspanel',
    // to be removed
    width: '100%',
    autoScroll: true,
    requires: ['PumaMain.view.LayerPanel','PumaMain.view.MapTools'],
    initComponent: function() {
        this.layout = {
            type: 'accordion',
            fill: false,
            multi: true
        }   
        this.items = [
             {
            xtype: 'treepanel',
            title: 'Areas',
            itemId: 'areatree',
            store: Ext.StoreMgr.lookup('area'),
            selModel: {
                mode: 'MULTI'
            },
            rootVisible: false,
            displayField: 'name',
            height: 300
        }, {
            xtype: 'layerpanel',
            collapsed: true,
            height: 300,
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
            },{
                text: 'Instant',
                pressed: true,
                itemId: 'instantfilter',
                enableToggle: true
            },{
                text: 'Select',
                disabled: true,
                itemId: 'filterselect'
            }],
            title: 'Advanced filters',
            bodyCls: 'tools-filters-list'
        }]
        
        this.callParent();
        
    }
})


