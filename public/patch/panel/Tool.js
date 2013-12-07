Ext.define('Puma.patch.panel.Tool', {
    override: 'Ext.panel.Tool',
    initComponent: function() {
        this.height = 22;
        this.width = 22;
        this.margin = '0 0 0 5';
        this.callParent();
    },
})


