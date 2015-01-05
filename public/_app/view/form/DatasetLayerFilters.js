Ext.define('PumaMng.view.form.DatasetLayerFilters', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.datasetlayerfiltersform',
    requires: ['Puma.view.form.DefaultComboBox'],
    model: 'DatasetLayerFilters',
    initComponent: function() {


        this.items = [{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activedataset'),
                fieldLabel: 'Dataset',
                allowBlank: true,
                name: 'dataset',
                itemId: 'dataset'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activefeaturelayer'),
                fieldLabel: 'Layer',
                allowBlank: true,
                name: 'featureLayer',
                itemId: 'featureLayer'
            },{
                xtype: 'itemselector',
                store: Ext.StoreMgr.lookup('activeattribute'),
                valueField: '_id',
                fieldLabel: 'Attributes',
                name: 'filters',
                itemId: 'filters',
                displayField: 'name',
                allowBlank: true,
                height: 170
            }];

        this.callParent();
    }
})


