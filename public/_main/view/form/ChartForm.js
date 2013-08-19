Ext.define('PumaMain.view.form.ChartForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.chartconfigpanel',
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
                            }, {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('charttype4chart'),
                                fieldLabel: 'Type',
                                valueField: 'type',
                                name: 'type',
                                itemId: 'type'
                            }]
                    }, {
                        title: 'Attributes',
                        xtype: 'attributepanel'
                    },
                    {
                        title: 'Others',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('stacking4chart'),
                                fieldLabel: 'Stacking',
                                valueField: 'type',
                                value: 'none',
                                name: 'stacking',
                                itemId: 'stacking'
                            }, {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('aggregate4chart'),
                                fieldLabel: 'Aggregate',
                                valueField: 'type',
                                name: 'aggregate',
                                itemId: 'aggregate'
                            }
                            , {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('layertemplate'),
                                fieldLabel: 'Extent outline template',
                                name: 'outlineLayerTemplate',
                                itemId: 'outlineLayerTemplate'
                            }
                        ]
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





