Ext.define('Puma.patch.tree.View', {
    override: 'Ext.tree.View',
    onCheckboxChange: function(e,t) {
        this.lastE = e;
        this.callParent(arguments);
    }

})


