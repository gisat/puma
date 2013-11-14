Ext.define('PumaMain.view.LayerPanel', {
    extend: 'Ext.tab.Panel',
    alias: 'widget.layerpanel',
    requires: ['Ext.ux.RowExpander'],
    initComponent: function() {

        var me = this;
        this.buttons = [{
            text: 'Configure',
            itemId: 'configurelayers'
        }]
        this.items = [
            {
                xtype: 'grid',
                itemId: 'layerselectedpanel',
                id: 'layerselectedpanel',
                store: Ext.StoreMgr.lookup('selectedlayers'),
                viewConfig: {
                    plugins: {ptype: 'gridviewdragdrop'}
                },
                title: 'Layers selected',
                displayField: 'name',
                bodyCls: 'layers-selected',
                border: true,
                plugins: [{
                    ptype: 'rowexpander',
                    rowBodyTpl : ['<tpl for=".">', '<div style="overflow-x:auto;background-color:white" class="layertools">', '<span class="layertool layertool-legend"><img src="images/icons/legend.png"><span>Legend</span></span>', '<span class="layertool layertool-opacity"><img src="images/icons/opacity.png"><span>Opacity</span></span>', '<span class="layertool layertool-metadata"><img src="images/icons/metadata.png"><span>Metadata</span></span>', '</div>', '</tpl>']
                }],
                columns: [{
                        dataIndex: 'checked',
                        xtype: 'checkcolumnwithheader',
                        listeners: {
                            checkchange: function(a,b,checked,rec) {
                                me.fireEvent('checkchange',rec,checked)
                            }
                        },
                        width: 30
                    },{
                        dataIndex: 'name',
                        flex: 1,
                        header: 'Name'
                    }
                    , {
                        xtype: 'actioncolumn',
                        width: 85,
                        items: [
                            {
                                icon: 'images/icons/opacity.png', // Use a URL in the icon config
                                tooltip: 'Opacity', 
                                width: 16,
                                height: 16,
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layeropacity',me,record)
                                }
                            },{
                                icon: 'images/icons/opacity.png', // Use a URL in the icon config
                                tooltip: 'Metadata', 
                                width: 16,
                                height: 16,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.get('type')!='topiclayer') {
                                        return 'invisible'
                                    }
                                },
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('showmetadata',me,record)
                                }
                            }
//                            ,{
//                                icon: 'http://dummyimage.com/15x15/fdd/000&text=CF', // Use a URL in the icon config
//                                tooltip: 'Configure', 
//                                width: 15,
//                                height: 20,
//                                getClass: function(v,metadata,rec) {
//                                    
//                                    if (rec.get('type')!='chartlayer') {
//                                        return 'invisible'
//                                    }
//                                },
//                                handler: function(grid, rowIndex, colIndex,item,e,record) {
//                                    me.fireEvent('choroplethreconfigure',me,record)
//                                }
//                            }
                            , {
                                icon: 'images/icons/up.png', // Use a URL in the icon config
                                tooltip: 'Up', 
                                width: 16,
                                height: 16,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.parentNode && rec.parentNode.get('type')=='basegroup') {
                                        return 'invisible'
                                    }
                                },
                               handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layerup',me,record)
                                }
                            },{
                                icon: 'images/icons/down.png', // Use a URL in the icon config
                                tooltip: 'Down', 
                                width: 16,
                                height: 16,
                                getClass: function(v,metadata,rec) {
                                    
                                    if (rec.parentNode && rec.parentNode.get('type')=='basegroup') {
                                        return 'invisible'
                                    }
                                },
                                handler: function(grid, rowIndex, colIndex,item,e,record) {
                                    me.fireEvent('layerdown',me,record)
                                }
                            }
//                            ,{
//                                icon: 'http://dummyimage.com/15x15/fdd/000&text=RE', // Use a URL in the icon config
//                                tooltip: 'Remove', 
//                                width: 15,
//                                height: 20,
//                                handler: function(grid, rowIndex, colIndex,item,e,record) {
//                                    me.fireEvent('layerremove',me,record)
//                                }
//                            }
                        ]
                    }
                    ],
                style: {
                    borderRadius: '0px',
                    //overflow: 'hidden'
                    //backgroundColor: '#ffffee'
                }
            },{
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
//                    ,
//                    {
//                        xtype: 'actioncolumn',
//                        width: 45,
//                        items: [{
//                                icon: 'http://dummyimage.com/15x15/fdd/000&text=CF', // Use a URL in the icon config
//                                tooltip: 'Configure', 
//                                width: 15,
//                                height: 20,
//                                getClass: function(v,metadata,rec) {
//                                    
//                                    if (rec.get('type')!='chartlayer') {
//                                        return 'invisible'
//                                    }
//                                },
//                                handler: function(grid, rowIndex, colIndex,item,e,record) {
//                                    me.fireEvent('choroplethreconfigure',me,record)
//                                }
//                            }, {
//                                icon: 'http://dummyimage.com/15x15/fdd/000&text=RE', // Use a URL in the icon config
//                                tooltip: 'Remove', 
//                                width: 15,
//                                height: 20,
//                                getClass: function(v,metadata,rec) {
//                                    
//                                    if (rec.get('type')!='chartlayer') {
//                                        return 'invisible'
//                                    }
//                                },
//                                handler: function(grid, rowIndex, colIndex,item,e,record) {
//                                    me.fireEvent('choroplethremove',me,record)
//                                }
//                            }]
//                    }
                ],
                style: {
                    borderRadius: '0px'
                }
            }
        ]
        
        
        
        
        this.callParent();
        this.on('afterrender',function() {
            Ext.get('layerselectedpanel').on('click',function(e,dom) {
                Ext.get(dom)
            },null,{delegate:'.legenditem'})
        })
        
        this.addEvents('choroplethreconfigure','choroplethremove','layerremove','layeropacity','layerup','layerdown','checkchange','showmetadata');
    }
})


