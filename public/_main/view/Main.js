Ext.define('PumaMain.view.Main', {
    extend: 'Ext.container.Viewport',
    alias: 'widget.mainviewport',
    layout: 'border',
    requires: ['Ext.grid.plugin.DragDrop', 'Puma.view.LoginHeader', 'Ext.tip.QuickTipManager', 'Puma.view.form.DefaultComboBox', 'PumaMain.view.ChartBar', 'PumaMain.view.InitialBar'],
    //minWidth: 1520,
    //minHeight: 670,
    autoScroll: true,
    frame: false,
    initComponent: function() {

        this.defaults = {
            margin: 5
        },
        this.items = [{
                xtype: 'loginheader',
                weight: 100,
                region: 'north',
                margin: 0,
                height: 40
            }, {
                xtype: 'container',
                weight: 100,
                region: 'south',
                height: 25
            }, {
                xtype: 'container',
                region: 'west',
                split: true,
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [{
                        xtype: 'treepanel',
                        title: 'Areas',
                        itemId: 'areatree',
                        store: Ext.StoreMgr.lookup('area'),
                        //frame: true,
                        flex: 1,
                        margin: '0 0 10 0',
                        selModel: {
                            mode: 'MULTI'
                        },
                        rootVisible: false,
                        displayField: 'name',
                        border: true,
                        style: {
                            borderRadius: '0px',
                            //overflow: 'hidden'
                            //backgroundColor: '#ffffee'
                        }
                    }, {
                        xtype: 'tabpanel',
                        flex: 1,
                        title: 'Layers',
                        items: [
                            {
                                xtype: 'treepanel',
                                itemId: 'layerpanel',
//                                viewConfig: {
//                                    plugins: {ptype: 'treeviewdragdrop'}
//                                },
                                store: Ext.StoreMgr.lookup('layers'),
                                //frame: true,
                                title: 'Layers available',
                                displayField: 'name',
                                rootVisible: false,
                                border: true,
                                style: {
                                    borderRadius: '0px',
                                    //overflow: 'hidden'
                                    //backgroundColor: '#ffffee'
                                }
                            }, {
                                xtype: 'grid',
                                itemId: 'layerselectedpanel',
                                store: Ext.StoreMgr.lookup('selectedlayers'),
                                viewConfig: {
                                    plugins: {ptype: 'gridviewdragdrop'}
                                },
                                title: 'Layers selected',
                                displayField: 'name',
                                border: true,
                                columns: [{
                                        dataIndex: 'name',
                                        flex: 1,
                                        header: 'Name'
                                    }],
                                style: {
                                    borderRadius: '0px',
                                    //overflow: 'hidden'
                                    //backgroundColor: '#ffffee'
                                }
                            }, {
                                xtype: 'dataview',
                                itemId: 'legendpanel',
                                title: 'Legend',
                                autoScroll: true,
                                itemSelector: 'div.legenditem',
                                tpl:  ['<tpl for=".">','<tpl if="src">','<div class="legenditem">','<img src="{src}">','</div>','</tpl>','</tpl>'],
                                //tpl:  ['<div class="legenditem">','<tpl for=".">','<img src="http://dummyimage.com/318x100&text={name}">','</tpl>','</div>'],
                                store: Ext.StoreMgr.lookup('selectedlayers')
                            }
                        ]
                    },
                ],
                width: 320
            }, {
                xtype: 'chartbar',
                region: 'east',
                width: 600,
                split: false,
                itemId: 'chartcontainer',
                split: true,
                        autoScroll: true
            }, {
                xtype: 'container',
                region: 'center',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [
                    {xtype: 'initialbar',
                        height: 198}, {
                        layout: {
                            type: 'hbox',
                            align: 'stretch'
                        },
                        flex: 1,
                        xtype: 'container',
                        items: [{
                                xtype: 'component',
                                flex: 1,
                                id: 'map'
                            }, {xtype: 'component',
                                flex: 1,
                                hidden: true,
                                id: 'map2'}]
                    }
                ]

            }]
        this.callParent();
    }
});

