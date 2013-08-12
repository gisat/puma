Ext.define('PumaMain.view.LayerPanel', {
    extend: 'Ext.tab.Panel',
    alias: 'widget.layerpanel',
    requires: [],
    initComponent: function() {


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
                tpl: ['<tpl for=".">', '<tpl if="src">', '<div class="legenditem">', '<img src="{src}">', '</div>', '</tpl>', '</tpl>'],
                //tpl:  ['<div class="legenditem">','<tpl for=".">','<img src="http://dummyimage.com/318x100&text={name}">','</tpl>','</div>'],
                store: Ext.StoreMgr.lookup('selectedlayers')
            }
        ]
        this.callParent();
    }
})


