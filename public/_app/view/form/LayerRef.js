Ext.define('PumaMng.view.form.LayerRef', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.layerrefform',
    showPrecreateMsg: true,
    height: 300,
    requires: ['Gisatlib.grid.plugin.CustomEditorPlugin','Gisatlib.form.HiddenStoreField'],
    initComponent: function() {
        var attrStore = Ext.StoreMgr.lookup('attribute');
        var me = this;
        this.store = Ext.StoreMgr.lookup('layerref');
        this.model = 'LayerRef'
        var columnMapStore = Ext.create('Ext.data.Store', {
            model: 'Puma.model.ColumnMap',
            id: 'columnmapstore',
            data: []
        })
        var editing = Ext.create('Gisatlib.grid.plugin.CustomEditorPlugin');
        this.items = [{
                name: 'location',
                allowBlank: false,
                itemId: 'location',
                hidden: true,
                xtype: 'numberfield'
            }, {
                name: 'areaTemplate',
                allowBlank: false,
                itemId: 'areaTemplate',
                hidden: true,
                xtype: 'numberfield'
            }, {
                name: 'year',
                allowBlank: false,
                itemId: 'year',
                hidden: true,
                xtype: 'numberfield'
            }, {
                name: 'isData',
                allowBlank: false,
                itemId: 'isData',
                hidden: true,
                xtype: 'checkbox'
            },
            {
                name: 'attributeSet',
                allowBlank: true,
                itemId: 'attributeSet',
                hidden: true,
                xtype: 'numberfield'
            }, {
                xtype: 'pumacombo',
                allowBlank: false,
                name: 'layer',
                fieldLabel: 'Layer',
                store: Ext.StoreMgr.lookup('layerserver'),
                valueField: 'name',
                itemId: 'layer'
            },
            {
                xtype: 'pumacombo',
                name: 'fidColumn',
                allowBlank: false,
                hidden: true,
                disabled: true,
                //allowBlank: false,
                itemId: 'fidColumn',
                store: Ext.StoreMgr.lookup('columnnumber'),
                displayField: 'column',
                valueField: 'column',
                fieldLabel: 'FID column'
            }, {
                xtype: 'pumacombo',
                name: 'nameColumn',
                hidden: true,
                allowBlank: true,
                itemId: 'nameColumn',
                store: Ext.StoreMgr.lookup('columnstring'),
                displayField: 'column',
                valueField: 'column',
                fieldLabel: 'Name column'
            },
            {
                xtype: 'pumacombo',
                name: 'parentColumn',
                hidden: true,
                allowBlank: true,
                itemId: 'parentColumn',
                store: Ext.StoreMgr.lookup('columnnumber'),
                displayField: 'column',
                valueField: 'column',
                fieldLabel: 'Parent column'
            }, {
                xtype: 'textfield',
                name: 'wmsAddress',
                disabled: true,
                allowBlank: false,
                hidden: false,
                itemId: 'wmsAddress',
                fieldLabel: 'WMS Address'
            }, {
                xtype: 'textfield',
                name: 'wmsLayers',
                disabled: true,
                allowBlank: false,
                hidden: false,
                itemId: 'wmsLayers',
                fieldLabel: 'WMS Layers'
            }, {
                xtype: 'storefield',
                validator: function(val) {
                    var valid = true;
                    for (var i = 0; i < val.length; i++) {
                        var row = val[i];
                        if (!row.column) {
                            valid = 'Not all columns referenced';
                            break;
                        }
                    }
                    return valid;
                },
                itemId: 'columnMap',
                name: 'columnMap',
                store: columnMapStore
            }, {
                xtype: 'grid',
                plugins: [editing],
                hidden: true,
                padding: 10,
                maxHeight: 200,
                frame: true,
                itemId: 'columngrid',
                title: 'Column grid',
                columns: [{
                        dataIndex: 'attribute',
                        flex: 1,
                        header: 'Attribute',
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = attrStore.getById(value).get('name');
                            return name;
                        }
                    }, {
                        dataIndex: 'column',
                        flex: 1,
                        header: 'Column',
                        getEditor: function(rec) {
                            return me.getEditor(rec,me)
                        }
                    }],
                selModel: {
                    allowDeselect: true
                },
                store: columnMapStore
            }
        ]
        this.modelDef = {
            active: true
        }
        this.callParent();
    },

    getEditor: function(rec) {
        var attrId = rec.get('attribute');
        var attr = Ext.StoreMgr.lookup('attribute').getById(attrId);
        
        var storeName = attr.get('type')=='numeric' ? 'columnnumber' : 'columnstring'
        return {
            xtype: 'pumacombo',
            displayField: 'column',
            valueField: 'column',
            store: Ext.StoreMgr.lookup(storeName)
        }
    }
})

