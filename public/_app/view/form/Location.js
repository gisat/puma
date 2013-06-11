Ext.define('PumaMng.view.form.Location', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.locationform',
    requires: [],
    model: 'Location',
    initComponent: function() {
        
        
        this.items = [{
                    xtype: 'textfield',
                    name: 'bbox',
                    allowBlank: false,
                    fieldLabel: 'BBOX'
                }, {
                    xtype: 'textfield',
                    name: 'center',
                    allowBlank: false,
                    fieldLabel: 'Center'
                },  {
                    xtype: 'pumacombo',
                    name: 'dataset',
                    store: Ext.StoreMgr.lookup('activedataset'),
                    allowBlank: false,
                    fieldLabel: 'Dataset'
                }];

        this.callParent();
    }
})


