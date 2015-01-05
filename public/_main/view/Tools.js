Ext.define('PumaMain.view.Tools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toolspanel',
    // to be removed
    width: '100%',
    autoScroll: true,
    requires: ['PumaMain.view.LayerPanel','PumaMain.view.MapTools','Gisatlib.slider.DiscreteTimeline'],
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
            collapsed: false,
            tools: [{
                type: 'poweron',
                tooltip: '',
                hidden: true,
                itemId: 'poweron'
            },{
                type: 'refresh',
                tooltip: 'Reset',
                itemId: 'refresh'
            },{
                type: 'gear',
                tooltip: 'Configure filters',
                hidden: true,
                itemId: 'gear'
            },{
               type: 'detach',
               tooltip: 'Detach',
               
               cls: 'detach',
               itemId: 'undock'
            }],
            layout: {
                type: 'vbox',
                align: 'stretch'
                
            },
            itemId: 'advancedfilters',
            hidden: true,
            helpId: 'Filteringanalyticalunits',
//            buttons: [{
//                text: 'Configure',
//                hidden: true,
//                itemId: 'configurefilters'
//            },{
//                text: 'Instant',
//                hidden: true,
//                itemId: 'instantfilter',
//                enableToggle: true
//            },{
//                text: 'Select',
//                hidden: true,
//                disabled: true,
//                itemId: 'filterselect'
//            }],
            title: 'Filter by region type',
            bodyCls: 'tools-filters-list'
        },
          {
            xtype: 'panel',
            collapsed: false,
            tools: [{
                type: 'poweron',
                tooltip: 'Activate/deactivate filtering',
                hidden: false,
                cls: 'tool-active',
                itemId: 'poweron'
            },{
                type: 'add',
                tooltip: 'Check all filters',
                hidden: false,
                itemId: 'add'
            },{
                type: 'unselectall',
                tooltip: 'Reset',
                tooltip: 'Uncheck all filters',
                itemId: 'unselectall'
            },{
                type: 'gear',
                tooltip: 'Configure filters',
                hidden: true,
                itemId: 'gear'
            },{
               type: 'detach',
               tooltip: 'Detach',
               
               cls: 'detach',
               itemId: 'undock'
            }],
            layout: {
                type: 'vbox',
                align: 'stretch'
                
            },
            itemId: 'codefilters',
            border: false,
            
            //hidden: true,
            helpId: 'Filteringanalyticalunits',
//            buttons: [{
//                text: 'Configure',
//                hidden: true,
//                itemId: 'configurefilters'
//            },{
//                text: 'Instant',
//                hidden: true,
//                itemId: 'instantfilter',
//                enableToggle: true
//            },{
//                text: 'Select',
//                hidden: true,
//                disabled: true,
//                itemId: 'filterselect'
//            }],
            title: 'Filter by region type',
            bodyCls: 'tools-filters-list'
        },     
         {
            xtype: 'layerpanel',
            //maxHeight: 500,
            itemId: 'layerpanel',
            helpId: 'Layers',
            collapsed: true,
            tools: [{
                type: 'gear',
                hidden: true,
                tooltip: 'Configure thematic maps',
                itemId: 'gear'
            },{
               type: 'detach',
               cls: 'detach',
               tooltip: 'Detach',
               itemId: 'undock'
            }],
            height: 300,
            title: 'Layers'
        }, 
        {
            xtype: 'treepanel',
            hidden: true,
            title: 'Areas',
            itemId: 'areatree',
            helpId: 'TreeofanalyticalunitsAREAS',
            collapsed: true,
            store: Ext.StoreMgr.lookup('area'),
            viewConfig: {
                animate: false
            },
            selModel: {
                mode: 'MULTI'
            },
            tools: [{
                type: 'areacollapse',
                cls: 'areacollapse',
                hidden: true,
                tooltip: 'Collapse all',
                itemId: 'areacollapse'
            },{
               type: 'detach',
               cls: 'detach',
               tooltip: 'Detach',
               itemId: 'undock'
            }],
            rootVisible: false,
            displayField: 'name',
            height: 340
            //,maxHeight: 500
        },
        {
            xtype: 'panel',
            title: 'Selection color',
            itemId: 'selcolor',
            helpId: 'Multipleselectionshighlightedbyc',
            header: {height: 60},
            collapsed: true,
            tools: [{
               type: 'unselect',
               cls: 'unselect',
               tooltip: 'Unselect',
               itemId: 'unselect'
            },{
               type: 'unselectall',
               cls: 'unselectall',
               tooltip: 'Unselect all',
               itemId: 'unselectall'
            },{
               type: 'detach',
               cls: 'detach',
               tooltip: 'Detach',
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
                
            }]
             
             
         },{
            xtype: 'maptools',
            collapsed: true,
            itemId: 'maptools',
            helpId: 'Maptools',
            tools: [{
               type: 'detach',
               cls: 'detach',
               tooltip: 'Detach',
               itemId: 'undock'
            }],
            title: 'Map tools'
        }]
        
        this.callParent();
        
    }
})


