Ext.define('PumaMng.view.form.Attribute', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.attributeform',
    requires: ['Puma.view.form.DefaultComboBox'],
    model: 'Attribute',
    initComponent: function() {
        
        
        this.items = [ {
                    xtype: 'textfield',
                    name: 'code',
                    fieldLabel: 'Code'
                }, {
                    xtype: 'textfield',
                    name: 'color',
                    allowBlank: false,
                    fieldLabel: 'Color'
                },{
                    xtype: 'textfield',
                    name: 'units',
                    allowBlank: false,
                    fieldLabel: 'Units'
                }, {
                    xtype: 'pumacombo',
                    name: 'type',
                    valueField: 'type',
                    store: Ext.StoreMgr.lookup('attributetype'),
                    allowBlank: false,
                    fieldLabel: 'Type'
                }];

        this.callParent();
    }
})

