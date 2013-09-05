Ext.define('Puma.patch.panel.Panel', {
    override: 'Ext.panel.Panel',
    initComponent: function() {
        this.header = {
            width: 37
        }
        this.callParent();
    },
})

