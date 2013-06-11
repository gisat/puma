Ext.define('PumaMain.view.ChartConfig', {
    extend: 'Ext.form.Panel',
    alias: 'widget.chartconfigpanel',
    requires: ['Ext.picker.Color', 'Ext.ux.form.ItemSelector', 'Gisatlib.form.HiddenStoreField', 'Ext.grid.plugin.DragDrop'],
    width: 550,
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
        var classificationStore = Ext.create('Ext.data.Store', {
            data: [],
            fields: ['color', 'threshold','idx']
        })
        var attrStore = Ext.StoreMgr.lookup('mappedattribute4chart');
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
                        title: 'Areas',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('areas4chart'),
                                fieldLabel: 'Areas',
                                valueField: 'type',
                                name: 'areas',
                                itemId: 'areas'
                            }, {
                                xtype: 'colorpicker',
                                fieldLabel: 'CP',
                                value: 'FF0000',
                                allowToggle: true,
                                itemId: 'selectcolorpicker',
                                height: 20,
                                width: 120,
                                colors: ['ff0000', '00ff00', '0000ff', 'ffff00', '00ffff', 'ff00ff']
                            }, {
                                xtype: 'pumacombo',
                                store: this.areaTemplateStore,
                                fieldLabel: 'Area template',
                                name: 'areaTemplate',
                                itemId: 'areaTemplate'
                            }]
                    }, {
                        title: 'Attributes',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('attributeset4chart'),
                                fieldLabel: 'Attr set',
                                name: 'attributeSet',
                                itemId: 'attributeSet'
                            }, {
                                xtype: 'storefield',
                                itemId: 'attrs',
                                name: 'attrs',
                                store: attrStore
                            },
                            {
                                layout: {
                                    type: 'hbox'
                                },
                                xtype: 'container',
                                height: 205,
                                items: [
                                    {
                                        xtype: 'grid',
                                        flex: 1,
                                        height: 200,
                                        selModel: {
                                            mode: 'MULTI'
                                        },
                                        margin: '0 5 5 0',
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
                                            }]}, {
                                        xtype: 'grid',
                                        itemId: 'addedgrid',
                                        height: 200,
                                        margin: '0 5 5 0',
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
                                            }]
                                    }]
                            }]
                    }, {
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
                    }, {
                        title: 'Years',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                fieldLabel: 'Use master',
                                xtype: 'checkbox',
                                name: 'useMaster',
                                checked: true,
                                value: 'on',
                                defaultValue: 'on',
                                itemId: 'useMaster'
                            }, {
                                xtype: 'multiselect',
                                delimiter: null,
                                valueField: '_id',
                                displayField: 'name',
                                height: 170,
                                store: Ext.StoreMgr.lookup('year4chart'),
                                fieldLabel: 'Year',
                                name: 'years',
                                itemId: 'years'
                            }, , {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('year4chart'),
                                fieldLabel: 'Norm. year',
                                name: 'normalizationYear',
                                itemId: 'normalizationYear'
                            }]
                    },
                    {
                        title: 'Map',
                        layout: 'form',
                        frame: true,
                        padding: 10,
                        items: [{
                                xtype: 'checkbox',
                                fieldLabel: 'Map chart',
                                name: 'showMapChart',
                                itemId: 'showMapChart'
                            }, {
                                xtype: 'checkbox',
                                fieldLabel: 'Choropleth',
                                name: 'showChoropleth',
                                itemId: 'showChoropleth'
                            }, {
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
                                plugins:[Ext.create('Ext.grid.plugin.CellEditing', {
                                    clicksToEdit: 1
                                })],
                                buttons: [{
                                    text: 'Fill',
                                    itemId: 'fillbtn'
                                }],
                                columns: [{
                                        dataIndex: 'idx',
                                        header: '',
                                        width: 40
                                    },{
                                        dataIndex: 'color',
                                        header: 'Color',
                                        flex: 1,
                                        field: 'textfield'
                                    },{
                                        dataIndex: 'threshold',
                                        header: 'Threshold',
                                        hidden: true,
                                        field: 'numberfield',
                                        flex: 1
                                    }]},{
                                xtype: 'textfield',
                                forChoro: 1,
                                disabled: true,
                                fieldLabel: 'Null color',
                                name: 'nullColor',
                                itemId: 'nullColor'
                            },{
                                xtype: 'checkbox',
                                disabled: true,
                                forChoro: 1,
                                fieldLabel: 'Zeroes as null',
                                name: 'zeroesAsNull',
                                itemId: 'zeroesAsNull'
                            },{
                                xtype: 'numberfield',
                                hidden: true,
                                forChoro: 1,
                                value: 0,
                                name: 'mapAttributeIndex',
                                itemId: 'mapAttributeIndex'
                            }]
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
                            }, {
                                xtype: 'pumacombo',
                                store: Ext.StoreMgr.lookup('featurelayertemplate'),
                                fieldLabel: 'Feature count template',
                                name: 'aggregateFeatureTemplate',
                                itemId: 'aggregateFeatureTemplate'
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







