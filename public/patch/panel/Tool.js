Ext.define('Puma.patch.panel.Tool', {
    override: 'Ext.panel.Tool',
    initComponent: function() {
        this.height = 20;
        this.width = 20;
        this.margin = '0 5 0 0';
        this.callParent();
    },
})


