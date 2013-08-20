Ext.define('PumaMain.view.LayerPanel', {
    extend: 'Ext.tab.Panel',
    alias: 'widget.layerpanel',
    requires: ['Ext.ux.RowExpander'],
    initComponent: function() {

        var me = this;
        this.items = [
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
                columns: [{
                        xtype: 'treecolumn',
                        dataIndex: 'name',
                        flex: 1,
                        header: 'Name'
                    }
                    ,
                    {
                        xtype: 'actioncolumn',
                        width: 45,
                        items: [{
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=CF', // Use a URL in the icon config
                                tooltip: 'Configure', 
                                width: 15,
                                height: 20,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.get('type')!='chartlayer') {
                                        return 'invisible'
                                    }
                                },
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('choroplethreconfigure',me,record)
                                }
                            }, {
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=RE', // Use a URL in the icon config
                                tooltip: 'Remove', 
                                width: 15,
                                height: 20,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.get('type')!='chartlayer') {
                                        return 'invisible'
                                    }
                                },
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('choroplethremove',me,record)
                                }
                            }]
                    }
                ],
                style: {
                    borderRadius: '0px',
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
                plugins: [{
                    ptype: 'rowexpander',
                    rowBodyTpl : ['<tpl for=".">', '<tpl if="src">', '<div class="legenditem">', '<img src="{src}">', '</div>', '</tpl>', '</tpl>']
                }],
                columns: [{
                        dataIndex: 'name',
                        flex: 1,
                        header: 'Name'
                    }
                    , {
                        xtype: 'actioncolumn',
                        width: 100,
                        items: [
                            {
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=OP', // Use a URL in the icon config
                                tooltip: 'Opacity', 
                                width: 15,
                                height: 20,
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layeropacity',me,record)
                                }
                            },{
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=CF', // Use a URL in the icon config
                                tooltip: 'Configure', 
                                width: 15,
                                height: 20,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.get('type')!='chartlayer') {
                                        return 'invisible'
                                    }
                                },
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('choroplethreconfigure',me,record)
                                }
                            }, {
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=UP', // Use a URL in the icon config
                                tooltip: 'Up', 
                                width: 15,
                                height: 20,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.parentNode && rec.parentNode.get('type')=='basegroup') {
                                        return 'invisible'
                                    }
                                },
                               handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layerup',me,record)
                                }
                            },{
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=DO', // Use a URL in the icon config
                                tooltip: 'Down', 
                                width: 15,
                                height: 20,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.parentNode && rec.parentNode.get('type')=='basegroup') {
                                        return 'invisible'
                                    }
                                },
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layerdown',me,record)
                                }
                            },{
                                icon: 'http://dummyimage.com/15x15/fdd/000&text=RE', // Use a URL in the icon config
                                tooltip: 'Remove', 
                                width: 15,
                                height: 20,
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layerremove',me,record)
                                }
                            }]
                    }
                    ],
                style: {
                    borderRadius: '0px',
                    //overflow: 'hidden'
                    //backgroundColor: '#ffffee'
                }
            }
        ]
        this.callParent();
        this.addEvents('choroplethreconfigure','choroplethremove','layerremove','layeropacity','layerup','layerdown');
    }
})


