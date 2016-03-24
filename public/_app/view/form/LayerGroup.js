Ext.define('PumaMng.view.form.LayerGroup', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.layergroupform',
    requires: [],
    model: 'LayerGroup',
    initComponent: function() {
        
        
        this.items = [{
            xtype: 'numberfield',
            name: 'priority',
            fieldLabel: 'Priority (lower number, higher priority)'
        }];

        this.callParent();
    }
})


