Ext.define('PumaMain.view.InitialBar', {
    extend: 'Ext.container.Container',
    alias: 'widget.initialbar',
    requires: ['Ext.picker.Color'],
    initComponent: function() {


        this.layout = {
            type: 'vbox',
            align: 'stretch'
        }
        this.items = [{
                xtype: 'container',
                height: 24,
                itemId: 'focuscontainer',
                margin: '0 0 5 0',
                defaultType: 'button',
                layout: {
                    type: 'hbox',
                    pack: 'left'
                },
                items: [{
                    xtype: 'displayfield',
                    width: 80,
                    value: 'Focus: '
                }
//                ,{
//                    text: 'Global',
//                    itemId: 'global',
//                    allowDepress: false
//                },{
//                    text: 'Regional',
//                    allowDepress: false,
//                    itemId: 'regional'
//                }
            ],
                defaults: {
                    cls: 'focusbutton',
                    toggleGroup: 'focus',
                    margin: '0 3',
                    height: 24
                }
            },{
                xtype: 'container',
                height: 24,
                itemId: 'locationcontainer',
                margin: '0 0 5 0',
                defaultType: 'button',
                layout: {
                    type: 'hbox',
                    pack: 'left'
                },
                items: [{
                    xtype: 'displayfield',
                    width: 80,
                    value: 'Location: '
                }],
                defaults: {
                    cls: 'locationbutton',
                    toggleGroup: 'location',
                    margin: '0 3',
                    height: 24
                }
            }, {
                xtype: 'container',
                itemId: 'themecontainer',
                height: 24,
                margin: '0 0 5 0',
                defaultType: 'button',
                layout: {
                    type: 'hbox',
                    pack: 'left'
                },
                defaults: {
                    cls: 'themebutton',
                    toggleGroup: 'theme',
                    margin: '0 3',
                    height: 24
                },
                items: [{
                    xtype: 'displayfield',
                    width: 80,
                    value: 'Theme: '
                }]
            },{
                xtype: 'container',
                itemId: 'yearcontainer',
                margin: '0 0 5 0',
                height: 24,
                defaultType: 'button',
                layout: {
                    type: 'hbox',
                    pack: 'left'
                },
                defaults: {
                    cls: 'yearbutton',
                    toggleGroup: 'year',
                    margin: '0 3',
                    height: 24
                },
                items: [{
                    xtype: 'displayfield',
                    width: 80,
                    value: 'Year: '
                }]
            },{
                xtype: 'container',
                itemId: 'treecontainer',
                margin: '0 0 5 0',
                height: 24,
                defaultType: 'button',
                layout: {
                    type: 'hbox',
                    pack: 'left'
                },
                defaults: {
                    cls: 'treebutton',
                    toggleGroup: 'tree',
                    margin: '0 3',
                    height: 24
                },
                items: [{
                    xtype: 'displayfield',
                    width: 80,
                    value: 'Analysis level: '
                }]
            },{
                xtype: 'container',
                itemId: 'visualizationcontainer',
                margin: '0 0 5 0',
                height: 24,
                defaultType: 'button',
                layout: {
                    type: 'hbox',
                    pack: 'left'
                },
                defaults: {
                    cls: 'visualizationbutton',
                    toggleGroup: 'visualization',
                    margin: '0 3',
                    height: 24
                },
                items: [{
                    xtype: 'displayfield',
                    width: 80,
                    value: 'Visualization: '
                }]
            },{
                xtype: 'toolbar',
//                layout: {
//                    type: 'hbox',
//                    pack: 'center'
//                },
                items: [{
                        xtype: 'button',
                        itemId: 'selectinmapbtn',
                        enableToggle: true,
                        toggleGroup: 'mapmodal',
                        text: 'Select in map'
                },{
                        xtype: 'button',
                        itemId: 'hoverbtn',
                        enableToggle: true,
                        text: 'Hover'
                },{
                    xtype: 'colorpicker',
                    itemId: 'selectcolorpicker',
                    height: 20,
                    width: 120,
                    value: 'ff0000',
                    colors: ['ff0000','00ff00','0000ff','ffff00','00ffff','ff00ff']
                },{
                xtype: 'button',
                itemId: 'zoomselectedbtn',
                text: 'Zoom selected'
            },{
                xtype: 'button',
                itemId: 'chartbtn',
                text: 'Add chart'
            }, 
//            {
//                xtype: 'pumacombo',
//                store: Ext.StoreMgr.lookup('visualization'),
//                itemId: 'visualizationcombo'
//            }, {
//                xtype: 'button',
//                itemId: 'loadvisbtn',
//                text: 'Load'
//            }, {
//                xtype: 'button',
//                itemId: 'savevisbtn',
//                text: 'Save'
//            }, 
            {
                xtype: 'button',
                itemId: 'visualizationsbtn',
                text: 'Visualizations'
            },{
                xtype: 'button',
                itemId: 'savevisbtn',
                text: 'Save'
            },{
                xtype: 'button',
                enableToggle: true,
                itemId: 'addpolygonbtn',
                toggleGroup: 'mapmodal',
                text: 'P'
            },{
                xtype: 'button',
                itemId: 'addpointbtn',
                enableToggle: true,
                toggleGroup: 'mapmodal',
                text: 'C'
            },{
                xtype: 'button',
                itemId: 'deleteareabtn',
                enableToggle: true,
                toggleGroup: 'mapmodal',
                text: 'D'
            },{
                xtype: 'button',
                itemId: 'featureinfobtn',
                enableToggle: true,
                toggleGroup: 'mapmodal',
                text: '?'
            },{
                xtype: 'button',
                itemId: 'measurelinebtn',
                enableToggle: true,
                toggleGroup: 'mapmodal',
                text: 'M-LINE'
            },{
                xtype: 'button',
                itemId: 'measurepolygonbtn',
                enableToggle: true,
                toggleGroup: 'mapmodal',
                text: 'M-POLY'
            }
            ]
        }]
            

        this.callParent();
    }
});


