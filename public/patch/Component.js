Ext.define('Puma.patch.Component', {
    override: 'Ext.Component',
    initComponent: function() {
        this.callParent();
        this.on('render',function(cmp) {
            //cmp.getEl().on('click', function(){ this.fireEvent('click',cmp); }, cmp);
        })
    }
})

