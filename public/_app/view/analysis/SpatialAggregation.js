Ext.define('PumaMng.view.analysis.SpatialAggregation', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.spatialaggform',
    width: 650,
    requires: ['Gisatlib.grid.plugin.CustomEditorPlugin','Puma.model.AggregationMap'],
    initComponent: function() {
        var me = this;
        var attrStore = Ext.StoreMgr.lookup('attribute');
        var attrSetStore = Ext.StoreMgr.lookup('attributeset');
        this.store = Ext.StoreMgr.lookup('analysis');
        this.model = 'Analysis'
        var aggregationMapStore = Ext.create('Ext.data.Store', {
            model: 'Puma.model.AggregationMap',
            id: 'spatialaggmap',
            data: []
        })
        var editing = Ext.create('Gisatlib.grid.plugin.CustomEditorPlugin');
        this.items = [{
                name: 'type',
                allowBlank: false,
                itemId: 'type',
                xtype: 'hiddenfield'
            }, {
                name: 'name',
                allowBlank: false,
                fieldLabel: 'Name',
                itemId: 'name',
                xtype: 'textfield'
            },
            {
                xtype: 'itemselector',
                name: 'topics',
                itemId: 'topics',
                displayField: 'name',
                valueField: '_id',
                height: 170,
                store: Ext.StoreMgr.lookup('activetopic'),
                allowBlank: false,
                fieldLabel: 'Topics'
            },
            {
                xtype: 'pumacombo',
                name: 'areaTemplate',
                itemId: 'areaTemplate',
                store: Ext.StoreMgr.lookup('areatemplate4spatialagg'),
                allowBlank: false,
                fieldLabel: 'Feature layer template'
            },
            {
                xtype: 'pumacombo',
                name: 'attributeSet',
                itemId: 'attributeSet',
                store: Ext.StoreMgr.lookup('resultattributeset4spatialagg'),
                allowBlank: false,
                fieldLabel: 'Result attribute set'
            },
            {
                xtype: 'pumacombo',
                name: 'groupAttributeSet',
                itemId: 'groupAttributeSet',
                store: Ext.StoreMgr.lookup('groupattributeset4spatialagg'),
                fieldLabel: 'Group attribute set'
            },
            {
                xtype: 'pumacombo',
                name: 'groupAttribute',
                itemId: 'groupAttribute',
                store: Ext.StoreMgr.lookup('attribute4spatialagg'),
                fieldLabel: 'Group attribute'
            },
            {
                xtype: 'storefield',
                validator: function(val) {
                    var ownerForm = this.up('form');
                    if (!ownerForm) {
                        return false;
                    }
                    var groupAttr = ownerForm.getComponent('groupAttribute').getValue();
                    for (var i=0;i<val.length;i++) {
                        var rec = val[i];
                        var type = rec.type;
                        if (!type) {
                            return false;
                        }
                        if (type.search('attr')>-1 && !rec.calcAttribute) {
                            return false;
                        }
                        if (type=='avgattrattr' && !rec.normAttribute) {
                            return false;
                        }
                        if (groupAttr && !rec.groupVal) {
                            return false;
                        }
                    }
                    return true;
                },
                itemId: 'attributeMap',
                name: 'attributeMap',
                store: aggregationMapStore
            }, {
                xtype: 'grid',
                plugins: [editing],
                padding: 10,
                frame: true,
                height: 350,
                //width: 600,
                itemId: 'attributegrid',
                title: 'Attribute grid',
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
                    },{
                        dataIndex: 'type',
                        flex: 1,
                        header: 'Type',
                        field: {
                            xtype: 'pumacombo',
                            displayField: 'name',
                            valueField: 'type',
                            store: Ext.StoreMgr.lookup('spatialaggtype')
                        },
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = Ext.StoreMgr.lookup('spatialaggtype').query('type',value).get(0).get('name');
                            return name;
                        }
                    },{
                        dataIndex: 'calcAttributeSet',
                        flex: 1,
                        header: 'Attribute set',
                        field: {
                            xtype: 'pumacombo',
                            store: Ext.StoreMgr.lookup('groupattributeset4spatialagg'),
                            itemId: 'calcAttributeSet'
                        },
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = attrSetStore.getById(value).get('name');
                            return name;
                        }
                    },{
                        dataIndex: 'calcAttribute',
                        flex: 1,
                        header: 'Calc. attribute',
                        getEditor: function(rec,grid,column) {
                            return me.getEditor(rec,me,column)
                        },
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = attrStore.getById(value).get('name');
                            return name;
                        }
                    },{
                        dataIndex: 'normAttributeSet',
                        flex: 1,
                        header: 'Attribute set',
                        field: {
                            xtype: 'pumacombo',
                            store: Ext.StoreMgr.lookup('groupattributeset4spatialagg'),
                            itemId: 'normAttributeSet'
                        },
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = attrSetStore.getById(value).get('name');
                            return name;
                        }
                    },{
                        dataIndex: 'normAttribute',
                        flex: 1,
                        header: 'Norm. attribute',
                        getEditor: function(rec,grid,column) {
                            return me.getEditor(rec,me,column)
                        },
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = attrStore.getById(value).get('name');
                            return name;
                        }
                    },{
                        dataIndex: 'groupVal',
                        flex: 1,
                        header: 'Group val',
                        field: {
                            xtype: 'textfield',
                        },
                    }
                ],
                selModel: {
                    allowDeselect: true
                },
                store: aggregationMapStore
            }
        ]

        this.callParent();
    },
    getEditor: function(rec,form,column) {
        var attrSetFieldName = (column && column.dataIndex == 'calcAttribute') ? 'calcAttributeSet' : 'normAttributeSet'
        var attrSetId = rec.get(attrSetFieldName);
        
        var attributes = attrSetId ? Ext.StoreMgr.lookup('attributeset').getById(attrSetId).get('attributes') : [];
        //debugger;
        var store = Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            autoLoad: true,
            filters: [function(rec) {
                return Ext.Array.contains(attributes,rec.get('_id'));
            }],
            model: 'Puma.model.Attribute'
        })
        
        return {
            xtype: 'pumacombo',
            store: store
        }
    }
})


