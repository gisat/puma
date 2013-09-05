Ext.define('Puma.patch.panel.Tool', {
    override: 'Ext.panel.Tool',
    initComponent: function() {
        this.height = 30;
        this.width = 30;
        this.margin = '0 20 0 20';
        this.callParent();
    },
})


