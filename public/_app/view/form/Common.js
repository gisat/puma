Ext.define('PumaMng.view.form.Common', {
    extend: 'Puma.view.CommonForm',
    alias: 'widget.commonmngform',
    requires: [],
    padding: 5,
    initComponent: function() {
        this.padding = 10;
        this.items.splice(0, 0, {
            xtype: 'textfield',
            name: 'name',
            allowBlank: false,
            fieldLabel: 'Name'
        });
        this.items.push({
            fieldLabel: 'Active',
            xtype: 'checkbox',
            name: 'active',
            checked: true,
            defaultValue: true,
            itemId: 'active'
        });

        this.callParent();
    }
})


