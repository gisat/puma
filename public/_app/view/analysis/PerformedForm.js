Ext.define('PumaMng.view.analysis.PerformedForm', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.performedanalysisform',
    requires: ['Ext.ux.form.ItemSelector'],
    alwaysCreate: true,
    initComponent: function() {
        this.items = [
            {
                xtype: 'pumacombo',
                name: 'analysis',
                itemId: 'analysis',
                store: Ext.StoreMgr.lookup('analysis'),
                allowBlank: false,
                fieldLabel: 'Analysis'
            },
            {
                xtype: 'pumacombo',
                name: 'dataset',
                itemId: 'dataset',
                store: Ext.StoreMgr.lookup('activedataset'),
                allowBlank: false,
                fieldLabel: 'Dataset'
            },
            {
                xtype: 'pumacombo',
                name: 'location',
                itemId: 'location',
                store: Ext.StoreMgr.lookup('location4performedanalysis'),
                allowBlank: false,
                fieldLabel: 'Location'
            },{
                xtype: 'pumacombo',
                name: 'year',
                itemId: 'year',
                store: Ext.StoreMgr.lookup('activeyear'),
                allowBlank: false,
                fieldLabel: 'Year'
            },{
                xtype: 'itemselector',
                displayField: 'name',
                valueField: '_id',
                height: 170,
                name: 'featureLayerTemplates',
                itemId: 'featureLayerTemplates',
                store: Ext.StoreMgr.lookup('featurelayer4performedanalysis'),
                allowBlank: false,
//                validator: function(val) {
//                    var analysisVal = this.up('form').getComponent('analysis').getValue();
//                    if (!analysisVal) return false;
//                    debugger;
//                    var analysis = Ext.StoreMgr.lookup('analysis').getById(analysisVal);
//                    return (analysis.type=='fidagg' || val.length);
//                },
                fieldLabel: 'Feature layer template'
            }]
            this.model = 'PerformedAnalysis'
            this.callParent()
    }

    });

