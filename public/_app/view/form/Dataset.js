Ext.define('PumaMng.view.form.Dataset', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.datasetform',
    requires: [],
    model: 'Dataset',
    initComponent: function() {
        
        
        this.items = [{
                    xtype: 'itemselector',
                    store: Ext.StoreMgr.lookup('activefeaturelayer'),
                    fieldLabel: 'Feature layers',
                    name: 'featureLayers',
                    allowBlank: false,
                    itemId: 'featureLayers',
                    valueField: '_id',
                    displayField: 'name'
                }];

        this.callParent();
    }
})


