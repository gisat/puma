Ext.define('Puma.patch.panel.Panel', {
    override: 'Ext.panel.Panel',
    initComponent: function() {
        this.header = this.header !== false && (this.title || this.xtype=='window') ? {
            height: 30,
            collapseLeft: this.collapseLeft,
            collapseRight: this.collapseRight,
            leftSpace: this.leftSpace
        } : false;
        this.callParent();
    }
})

