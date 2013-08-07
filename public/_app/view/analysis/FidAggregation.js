Ext.define('PumaMng.view.analysis.FidAggregation', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.fidaggform',
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
            id: 'fidaggmap',
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
                xtype: 'itemselector',
                height: 170,
                displayField: 'name',
                valueField: '_id',
                name: 'attributeSets',
                itemId: 'attributeSets',
                store: Ext.StoreMgr.lookup('attributeset4fidagg'),
                allowBlank: false,
                fieldLabel: 'Attribute sets'
            },
            {
                xtype: 'storefield',
                validator: function(val) {
                    for (var i=0;i<val.length;i++) {
                        var rec = val[i];
                        var type = rec.type;
                        if (!type) {
                            return false;
                        }
                        if (type=='avgattr' && !rec.normAttribute) {
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
                maxHeight: 350,
                buttons : [{
                    text: 'Fill',
                    itemId: 'fillbtn'
                }],
                
                //width: 600,
                height: 300,
                itemId: 'attributegrid',
                title: 'Attribute grid',
                columns: [{
                        dataIndex: 'attributeSet',
                        flex: 1,
                        header: 'Attribute set',
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = attrSetStore.getById(value).get('name');
                            return name;
                        }
                    },{
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
                            store: Ext.StoreMgr.lookup('fidaggtype')
                        },
                        renderer: function(value) {
                            if (!value)
                                return '';
                            var name = Ext.StoreMgr.lookup('fidaggtype').query('type',value).get(0).get('name');
                            return name;
                        }
                    },{
                        dataIndex: 'normAttributeSet',
                        flex: 1,
                        header: 'Attribute set',
                        field: {
                            xtype: 'pumacombo',
                            store: Ext.StoreMgr.lookup('attributeset4fidagg'),
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


