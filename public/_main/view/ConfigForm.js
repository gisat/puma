Ext.define('PumaMain.view.ConfigForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.configform',
    autoScroll: true,
    frame: true,
    header: false,
    requires: ['Ext.ux.CheckColumn', 'PumaMain.view.AddAttributeTree','PumaMain.view.ChoroplethForm', 'PumaMain.view.AttributeGrid', 'Gisatlib.container.StoreContainer','PumaMain.view.NormalizeForm'],
    initComponent: function() {
        this.attrStore = Ext.create('Ext.data.Store', {
            data: [],
            model: 'Puma.model.MappedChartAttribute'
        })
        this.items = [{
                xtype: 'textfield',
                name: 'title',
                marginLeft: 5,
                hidden: this.formType!='chart',
                fieldLabel: 'Name'
            }, {
                                xtype: 'pumacombo',
                                marginLeft: 5,
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
                height: 500,
                itemId: 'attributecontainer',
                helpId: 'test',
                layout: 'card',
                items: [
            {
                xtype: 'attributegrid',
                formType: this.formType,
                store: this.attrStore
            }, {
                xtype: 'addattributetree'
            }, {
                xtype: 'normalizeform',
                formType: this.formType
            }, {
                xtype: 'form',
                bodyStyle:{
                    padding: '0px'
                },
                frame: true,
                items: [{
                        xtype: 'pumacombo',
                        store: Ext.StoreMgr.lookup('layers4outline'),
                        valueField: 'atWithSymbology',
                        fieldLabel: 'Layer',
                        name: 'featureLayer'
                    }, {
                        xtype: 'numberfield',
                        minValue: 0,
                        value: 70,
                        maxValue: 100,
                        fieldLabel: 'Opacity',
                        name: 'featureLayerOpacity'
                            }]

            }, {
                xtype: 'choroplethform'
            }]
        }, {
            xtype: 'multislider',
            itemId: 'constrainFl',
            name: 'constrainFl',
            values: [0, this.featureLayers.length-1],
            //hidden: this.formType!='filters',
            hidden: true,
            width: 672,
            useTips: {
                getText: function(thumb) {
                    return thumb.slider.up('form').featureLayers[thumb.value].get('name')
                }
            },
            increment: 1,
            minValue: 0,
            maxValue: this.featureLayers.length-1
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

