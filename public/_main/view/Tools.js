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
        this.defaults = {
            //hideCollapseTool: true
            collapseLeft: true
        }
        this.items = [
         {
            xtype: 'panel',
            title: 'Selection color',
            itemId: 'selcolor',
            helpId: 'Multipleselectionshighlightedbyc',
            header: {height: 60},
            tools: [{
               type: 'detach',
               cls: 'detach',
               itemId: 'undock'
            }],
            layout: {
                type: 'hbox',
                align: 'middle'
            },
            height: 72,
            items: [{
                    xtype: 'colorpicker',
                    fieldLabel: 'CP',
                    value: 'ff4c39',
                    itemId: 'selectcolorpicker',
                    height: 22,
                    margin: '0 10',
                    flex: 1,
                    //width: 120,
                    colors: ['ff4c39', '34ea81', '39b0ff', 'ffde58', '5c6d7e', 'd97dff']
                
            },{
                xtype: 'component',
                margin: '0 10',
                itemId: 'unselectbtn',
                html: '<span id="app-tools-colors-unselect">unselect</span>'
            }]
             
             
         },   
            
         {
            xtype: 'layerpanel',
            //maxHeight: 500,
            itemId: 'layerpanel',
            helpId: 'Layers',
            tools: [{
               type: 'detach',
               cls: 'detach',
               itemId: 'undock'
            }],
            height: 300,
            title: 'Layers'
        },   
        {
            xtype: 'treepanel',
            title: 'Areas',
            itemId: 'areatree',
            helpId: 'TreeofanalyticalunitsAREAS',
            collapsed: true,
            store: Ext.StoreMgr.lookup('area'),
            selModel: {
                mode: 'MULTI'
            },
            tools: [{
               type: 'detach',
               cls: 'detach',
               itemId: 'undock'
            }],
            rootVisible: false,
            displayField: 'name',
            height: 340
            //,maxHeight: 500
        }, {
            xtype: 'maptools',
            collapsed: false,
            itemId: 'maptools',
            helpId: 'Maptools',
            tools: [{
               type: 'detach',
               cls: 'detach',
               itemId: 'undock'
            }],
            title: 'Map tools'
        },{
            xtype: 'panel',
            collapsed: true,
            tools: [{
               type: 'detach',
               cls: 'detach',
               itemId: 'undock'
            }],
            layout: {
                type: 'vbox',
                align: 'stretch'
                
            },
            itemId: 'advancedfilters',
            helpId: 'Filteringanalyticalunits',
            buttons: [{
                text: 'Configure',
                itemId: 'configurefilters'
            },{
                text: 'Instant',
                hidden: true,
                itemId: 'instantfilter',
                enableToggle: true
            },{
                text: 'Select',
                hidden: true,
                disabled: true,
                itemId: 'filterselect'
            }],
            title: 'Advanced filters',
            bodyCls: 'tools-filters-list'
        }]
        
        this.callParent();
        
    }
})


