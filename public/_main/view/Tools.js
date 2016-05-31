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
        var colourSelection = {
            xtype: 'panel',
            title: 'Selection color',
            itemId: 'selcolor',
            helpId: 'Multipleselectionshighlightedbyc',
            header: {height: 60},
            tools: [{
                type: 'unselect',
                cls: 'unselect',
                tooltip: 'Unselect last added',
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
        };
        var advancedFilters = {
            xtype: 'panel',
            collapsed: true,
            tools: [{
                type: 'poweron',
                tooltip: 'Activate/deactivate',
                itemId: 'poweron'
            },{
                type: 'refresh',
                tooltip: 'Reset',
                itemId: 'refresh'
            },{
                type: 'gear',
                tooltip: 'Configure filters',
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
            title: Config.texts.advancedFiltersName,
            bodyCls: 'tools-filters-list'
        };
        var layers = {
            xtype: 'layerpanel',
            //maxHeight: 500,
            itemId: 'layerpanel',
            helpId: 'Layers',
            tools: [{
                type: 'gear',
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
        };
        var areas = {
            xtype: 'treepanel',
            title: Config.texts.areasSectionName,
            itemId: 'areatree',
            helpId: 'TreeofanalyticalunitsAREAS',
            collapsed: true,
            store: Ext.StoreMgr.lookup('area'),
            selModel: {
                mode: 'MULTI'
            },
            tools: [{
                type: 'areacollapse',
                cls: 'areacollapse',
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
        };
        var maptools = {
            xtype: 'maptools',
            collapsed: false,
            itemId: 'maptools',
            helpId: 'Maptools',
            tools: [{
                type: 'detach',
                cls: 'detach',
                tooltip: 'Detach',
                itemId: 'undock'
            }],
            title: 'Map tools'
        };

        this.items = [colourSelection,layers,areas,maptools,advancedFilters];
        if (Config.toggles.advancedFiltersFirst){
            this.items = [colourSelection,advancedFilters,layers,areas,maptools]
        }

        this.callParent();
        
    }
})


