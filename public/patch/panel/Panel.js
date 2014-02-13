Ext.define('Puma.patch.panel.Panel', {
    override: 'Ext.panel.Panel',
    initComponent: function() {
        this.header = this.header !== false && (this.title || this.xtype=='window') ? {
            height: 31,
            collapseLeft: this.collapseLeft,
            collapseRight: this.collapseRight,
            leftMargin: this.leftMargin,
            topMargin: this.topMargin,
            leftSpace: this.leftSpace
        } : false;
        this.callParent();
    }
})

