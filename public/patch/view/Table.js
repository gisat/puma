Ext.define('Puma.patch.view.Table', {
    override: 'Ext.view.Table',
    refreshSize: function() {
        if (!this.dontRefreshSize) {
            this.callParent();
        }
    }

})


