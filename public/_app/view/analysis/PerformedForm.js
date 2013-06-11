Ext.define('PumaMng.view.analysis.PerformedForm', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.performedanalysisform',
    requires: ['Ext.ux.form.ItemSelector'],
    initComponent: function() {
        this.items = [
            {
                xtype: 'pumacombo',
                name: 'analysis',
                store: Ext.StoreMgr.lookup('analysis'),
                allowBlank: false,
                fieldLabel: 'Analysis'
            },
            {
                xtype: 'pumacombo',
                name: 'location',
                store: Ext.StoreMgr.lookup('location'),
                allowBlank: false,
                fieldLabel: 'Location'
            },{
                xtype: 'pumacombo',
                name: 'year',
                store: Ext.StoreMgr.lookup('year'),
                allowBlank: false,
                fieldLabel: 'Year'
            },{
                xtype: 'itemselector',
                displayField: 'name',
                valueField: '_id',
                name: 'featureLayerTemplates',
                store: Ext.StoreMgr.lookup('featurelayertemplatemng'),
                allowBlank: false,
                fieldLabel: 'Feature layer template'
            },{
                xtype: 'pumacombo',
                name: 'tree',
                store: Ext.StoreMgr.lookup('treemng'),
                fieldLabel: 'Tree'
            }]
            this.model = 'PerformedAnalysis'
            this.callParent()
    }

    });

