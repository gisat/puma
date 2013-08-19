Ext.define('PumaMain.view.form.AttributePanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.attributepanel',
    requires: ['Ext.ux.form.ItemSelector', 'Gisatlib.form.HiddenStoreField', 'Ext.grid.plugin.DragDrop'],
    width: 800,
    frame: true,
    padding: 10,
    initComponent: function() {

        var attrStore = Ext.StoreMgr.lookup('mappedattribute4chart');
        this.items = [{
                xtype: 'container',
                height: 250,
                layout: {
                    type: 'hbox'
                },
                items: [{
                        xtype: 'container',
                        flex: 1,
                        padding: 10,
                        layout: 'form',
                        items: [{
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('activeattributeset'),
                                fieldLabel: 'Attr set',
                                name: 'attributeSet',
                                itemId: 'attributeSet'
                            },
                            {
                                xtype: 'storefield',
                                itemId: 'attrs',
                                name: 'attrs',
                                store: attrStore
                            }, {
                                xtype: 'grid',
                                flex: 1,
                                height: 200,
                                selModel: {
                                    mode: 'MULTI'
                                },
                                itemId: 'selgrid',
                                store: Ext.StoreMgr.lookup('attribute4chart'),
                                buttons: [{
                                        text: 'Add',
                                        itemId: 'addattrbtn'
                                    }],
                                columns: [{
                                        dataIndex: 'name',
                                        header: 'Name',
                                        flex: 1
                                    }]}]
                    }, {
                        xtype: 'container',
                        flex: 1,
                        padding: 10,
                        layout: 'form',
                        items: [{
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('normalization4chart'),
                                fieldLabel: 'Norm type',
                                name: 'normType',
                                valueField: 'type',
                                itemId: 'normType'
                            }, {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('activeattributeset'),
                                fieldLabel: 'Norm Attr set',
                                name: 'normAttributeSet',
                                itemId: 'normAttributeSet'
                            }, {
                                xtype: 'grid',
                                flex: 1,
                                height: 143,
                                itemId: 'normselgrid',
                                store: Ext.StoreMgr.lookup('normattribute4chart'),
                                columns: [{
                                        dataIndex: 'name',
                                        header: 'Name',
                                        flex: 1
                                    }]}]
                    }]
            }, {
                xtype: 'grid',
                itemId: 'addedgrid',
                height: 200,
                margin: 10,
                flex: 2,
                selModel: {
                    mode: 'MULTI'
                },
                buttons: [{
                        text: 'Remove',
                        itemId: 'removeattrbtn'
                    }],
                store: attrStore,
                viewConfig: {
                    plugins: {
                        ptype: 'gridviewdragdrop'
                    }
                },
                columns: [{
                        dataIndex: 'as',
                        header: 'Attr set',
                        flex: 1,
                        renderer: function(value) {
                            var store = Ext.StoreMgr.lookup('attributeset');
                            var attrSet = store.getById(value);
                            return attrSet.get('name')
                        }
                    }, {
                        dataIndex: 'attr',
                        header: 'Attr',
                        flex: 1,
                        renderer: function(value) {
                            var store = Ext.StoreMgr.lookup('attribute');
                            var attr = store.getById(value);
                            return attr.get('name')
                        }
                    }, {
                        dataIndex: 'normType',
                        header: 'Norm',
                        flex: 1,
                        renderer: function(value) {
                            var store = Ext.StoreMgr.lookup('normalization4chart');
                            var norm = store.findRecord('type', value);
                            return norm ? norm.get('name') : '';
                        }
                    }, {
                        dataIndex: 'normAs',
                        header: 'Norm attr set',
                        flex: 1,
                        renderer: function(value) {
                            var store = Ext.StoreMgr.lookup('attributeset');
                            var attrSet = store.getById(value);
                            return attrSet ? attrSet.get('name') : '';
                        }
                    }, {
                        dataIndex: 'normAttr',
                        header: 'Norm attr',
                        flex: 1,
                        renderer: function(value) {
                            var store = Ext.StoreMgr.lookup('attribute');
                            var attr = store.getById(value);
                            return attr ? attr.get('name') : '';
                        }
                    }]
            }]





        this.callParent();
    }
})





