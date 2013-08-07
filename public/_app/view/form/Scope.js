Ext.define('PumaMng.view.form.Scope', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.scopeform',
    requires: [],
    model: 'Scope',
    initComponent: function() {
        
        
        this.items = [{
            xtype: 'itemselector',
            store: Ext.StoreMgr.lookup('activedataset'),
            displayField: 'name',
            valueField: '_id',
            height: 160,
            fieldLabel: 'Datasets',
            name: 'datasets',
            itemId: 'datasets'
        }];

        this.callParent();
    }
})

