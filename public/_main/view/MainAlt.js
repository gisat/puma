Ext.define('PumaMain.view.MainAlt', {
    extend: 'Ext.container.Viewport',
    alias: 'widget.mainviewportalt',
    layout: 'border',
    requires: ['Ext.tree.plugin.TreeViewDragDrop', 'Puma.view.LoginHeader', 'Ext.tip.QuickTipManager', 'Puma.view.form.DefaultComboBox', 'PumaMain.view.ChartBar', 'PumaMain.view.InitialBar'],
    //minWidth: 1250,
    //minHeight: 860,
    autoScroll: true,
    frame: false,
    initComponent: function() {

        this.defaults = {
            margin: 5
        }
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
                height: 10
            }, {
                xtype: 'container',
                region: 'west',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [],
                width: 5
            }, {
                xtype: 'chartbar',
                region: 'east',
                width: 600,
                split: false,
                itemId: 'chartcontainer',
                collapsible: true,
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
                        height: 205},
                    {
                        xtype: 'component',
                        flex: 1,
                        id: 'map'
                    }, {
                        xtype: 'container',
                        margin: '10 0 0 0',
                        height: 260,
                        layout: {
                            type: 'hbox',
                            align: 'stretch'},
                        items: [
                            {
                                xtype: 'treepanel',
                                title: 'Areas',
                                itemId: 'areatree',
                                store: Ext.StoreMgr.lookup('area'),
                                //frame: true,
                                flex: 1,
                                margin: '0 10 0 0',
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
                                xtype: 'treepanel',
                                itemId: 'layerpanel',
                                viewConfig: {
                                    plugins: {ptype: 'treeviewdragdrop'}
                                },
                                store: Ext.StoreMgr.lookup('layers'),
                                //frame: true,
                                flex: 1,
                                title: 'Layers',
                                displayField: 'name',
                                rootVisible: false,
                                border: true,
                                style: {
                                    borderRadius: '0px',
                                    //overflow: 'hidden'
                                    //backgroundColor: '#ffffee'
                                }
                            }
                        ]
                    }
                ]

            }]
        this.callParent();
    }
});




