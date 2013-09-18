Ext.define('PumaMng.view.form.Location', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.locationform',
    requires: [],
    model: 'Location',
    initComponent: function() {
        
        
        this.items = [ {
                    xtype: 'pumacombo',
                    name: 'dataset',
                    store: Ext.StoreMgr.lookup('activedataset'),
                    allowBlank: true,
                    fieldLabel: 'Dataset'
                }];

        this.callParent();
    }
})


