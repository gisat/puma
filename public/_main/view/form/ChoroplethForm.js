Ext.define('PumaMain.view.form.ChoroplethForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.choroplethpanel',
    requires: ['Ext.ux.form.ItemSelector', 'PumaMain.view.form.AttributePanel'],
    width: 800,
    initComponent: function() {
          var classificationStore = Ext.create('Ext.data.Store', {
            data: [],
            fields: ['color', 'threshold', 'idx']
        })
        this.fieldDefaults = {
            labelAlign: 'left',
            labelWidth: 90,
            anchor: '100%'
        };
        this.defaults = {
            labelAlign: 'left',
            labelWidth: 90,
            anchor: '100%'
        }
        this.items = [{
                xtype: 'tabpanel',
                items: [{
                        title: 'Basic',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'textfield',
                                name: 'title',
                                value: 'Anonymous',
                                fieldLabel: 'Title'
                            }]
                    }, {
                        title: 'Attributes',
                        xtype: 'attributepanel'
                    },{
                        title: 'Normalization',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('normalization4chart'),
                                fieldLabel: 'Normalization',
                                name: 'normalization',
                                valueField: 'type',
                                itemId: 'normalization'
                            }, {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('attributeset4chart'),
                                fieldLabel: 'Norm. attr. set',
                                name: 'normalizationAttributeSet',
                                itemId: 'normalizationAttributeSet'
                            }, {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('attribute4chart4norm'),
                                fieldLabel: 'Norm. attribute',
                                name: 'normalizationAttribute',
                                itemId: 'normalizationAttribute'
                            }]
                    },
                    {title: 'Map',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'numberfield',
                                fieldLabel: 'Num categories',
                                name: 'numCategories',
                                forChoro: 1,
                                value: 3,
                                allowDecimals: false,
                                itemId: 'numCategories'
                            }, {
                                xtype: 'pumacombo',
                                forChoro: 1,
                                store: Ext.StoreMgr.lookup('classificationtype'),
                                fieldLabel: 'Class. type',
                                itemId: 'classType',
                                name: 'classType',
                                value: 'continuous',
                                valueField: 'type'
                            }, {
                                xtype: 'checkbox',
                                forChoro: 1,
                                checked: true,
                                fieldLabel: 'Use attr. colors',
                                name: 'useAttributeColors',
                                itemId: 'useAttributeColors'
                            }, {
                                xtype: 'storefield',
                                itemId: 'classConfig',
                                name: 'classConfig',
                                forChoro: 1,
                                store: classificationStore
                            }, {
                                xtype: 'grid',
                                forChoro: 1,
                                height: 200,
                                itemId: 'classgrid',
                                store: classificationStore,
                                plugins: [Ext.create('Ext.grid.plugin.CellEditing', {
                                        clicksToEdit: 1
                                    })],
                                buttons: [{
                                        text: 'Fill',
                                        itemId: 'fillbtn'
                                    }],
                                columns: [{
                                        dataIndex: 'idx',
                                        header: '',
                                        hidden: true,
                                        flex: 1,
                                    }, {
                                        dataIndex: 'color',
                                        header: 'Color',
                                        flex: 1,
                                        hidden: true,
                                        field: 'textfield'
                                    }, {
                                        dataIndex: 'threshold',
                                        header: 'Threshold',
                                        hidden: true,
                                        field: 'numberfield',
                                        flex: 1
                                    }]}, {
                                xtype: 'textfield',
                                forChoro: 1,
                                fieldLabel: 'Null color',
                                name: 'nullColor',
                                itemId: 'nullColor'
                            }, {
                                xtype: 'checkbox',
                                forChoro: 1,
                                fieldLabel: 'Zeroes as null',
                                name: 'zeroesAsNull',
                                itemId: 'zeroesAsNull'
                            }, {
                                xtype: 'numberfield',
                                forChoro: 1,
                                hidden: true,
                                value: 0,
                                name: 'mapAttributeIndex',
                                itemId: 'mapAttributeIndex'
                            }]
                    }]


            }]

        this.buttons = [
            {
                itemId: this.reconfiguring ? 'reconfigurebtn' : 'addbtn',
                text: this.reconfiguring ? 'Reconfigure' : 'Add'
            },
            {
                itemId: 'closebtn',
                text: 'Close',
                handler: function(btn) {
                    btn.up('window').close();
                }
            }
        ]


        this.callParent();
    }
})