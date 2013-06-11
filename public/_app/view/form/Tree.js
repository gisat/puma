Ext.define('PumaMng.view.form.Tree', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.treeform',
    requires: [],
    model:'Tree',
    initComponent: function() {
        
        
        this.items = [{
                    xtype: 'itemselector',
                    store: Ext.StoreMgr.lookup('featurelayertemplate4tree'),
                    valueField: '_id',
                    fieldLabel: 'Levels',
                    name: 'featureLayerTemplates',
                    itemId: 'featureLayerTemplates',
                    displayField: 'name',
                    height: 170
                }];

        this.callParent();
    }
})


