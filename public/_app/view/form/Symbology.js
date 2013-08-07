Ext.define('PumaMng.view.form.Symbology', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.symbologyform',
    requires: [],
    model: 'Symbology',
    initComponent: function() {
        
        
        this.items = [{
                    xtype: 'textfield',
                    name: 'symbologyName',
                    allowBlank: false,
                    fieldLabel: 'Server symbology'
                },{
                    xtype: 'pumacombo',
                    store: Ext.StoreMgr.lookup('activetopic'),
                    fieldLabel: 'Topic',
                    allowBlank: false,
                    name: 'topic',
                    itemId: 'topic'
                }];

        this.callParent();
    }
})


