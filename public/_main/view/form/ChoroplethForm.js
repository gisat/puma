Ext.define('PumaMain.view.form.ChoroplethForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.choroplethpanel',
    requires: ['Ext.ux.form.ItemSelector', 'PumaMain.view.form.AttributePanel'],
    width: 800,
    initComponent: function() {

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
                                fieldLabel: 'Title'
                            }]
                    }, {
                        title: 'Attributes',
                        xtype: 'attributepanel'
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
                                disabled: true,
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
                                valueField: 'type',
                                disabled: true
                            }, {
                                xtype: 'checkbox',
                                disabled: true,
                                forChoro: 1,
                                checked: true,
                                fieldLabel: 'Use attr. colors',
                                name: 'useAttributeColors',
                                itemId: 'useAttributeColors'
                            }, {
                                xtype: 'storefield',
                                disabled: true,
                                itemId: 'classConfig',
                                name: 'classConfig',
                                forChoro: 1,
                                store: classificationStore
                            }, {
                                xtype: 'grid',
                                forChoro: 1,
                                disabled: true,
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
                                disabled: true,
                                fieldLabel: 'Null color',
                                name: 'nullColor',
                                itemId: 'nullColor'
                            }, {
                                xtype: 'checkbox',
                                disabled: true,
                                forChoro: 1,
                                fieldLabel: 'Zeroes as null',
                                name: 'zeroesAsNull',
                                itemId: 'zeroesAsNull'
                            }, {
                                xtype: 'numberfield',
                                hidden: true,
                                forChoro: 1,
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
                text: 'Close'
            }
        ]


        this.callParent();
    }
})