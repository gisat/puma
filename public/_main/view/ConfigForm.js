Ext.define('PumaMain.view.ConfigForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.configform',
    autoScroll: true,
    frame: true,
    header: false,
    requires: ['Ext.ux.CheckColumn', 'PumaMain.view.AddAttributeGrid','PumaMain.view.ChoroplethForm', 'PumaMain.view.AttributeGrid', 'Gisatlib.container.StoreContainer','PumaMain.view.NormalizeForm'],
    initComponent: function() {
        this.attrStore = Ext.create('Ext.data.Store', {
            data: [],
            model: 'Puma.model.MappedChartAttribute'
        })
        this.items = [{
                xtype: 'textfield',
                name: 'title',
                hidden: this.formType!='chart',
                fieldLabel: 'Name'
            }, {
                                xtype: 'pumacombo',
                                
                                hidden: this.formType!='chart',
                                store: Ext.StoreMgr.lookup('charttype4chart'),
                                fieldLabel: 'Type',
                                valueField: 'type',
                                name: 'type',
                                itemId: 'type'
                            },
            {
                xtype: 'storefield',
                itemId: 'attrs',
                name: 'attrs',
                hidden: true,
                store: this.attrStore
            }, {
                xtype: 'container',
                hidden: this.formType=='chart',
                height: 300,
                itemId: 'attributecontainer',
                helpId: 'test',
                layout: 'card',
                items: [
                    {
                        xtype: 'attributegrid',
                        formType: this.formType,
                        store: this.attrStore
                    }, {
                        xtype: 'addattributegrid'
                    }, {
                        xtype: 'normalizeform'
                    },{
                        xtype: 'pumacombo',
                        store: Ext.StoreMgr.lookup('layers4outline'),
                        valueField: 'atWithSymbology',
                        fieldLabel: 'Layer',
                        name: 'featureLayer'
            },{
                        xtype: 'choroplethform'
            }]
        }, {
            xtype: 'multislider',
            itemId: 'constrainFl',
            name: 'constrainFl',
            values: [0, this.levelCount-1],
            hidden: this.formType!='filters',
            width: 300,
            increment: 1,
            minValue: 0,
            maxValue: this.levelCount-1
            ,
            //constrainThumbs: true
        }, {
                xtype: 'fieldset',
                itemId: 'advancedfieldset',
                collapsible: true,
                collapsed: true,
                hidden: true,
                title: 'Advanced',
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
                    }]
            }];
            this.buttons = [{
                text: 'Configure',
                itemId: 'configurefinish'
            }]
        this.callParent();

    }
})

