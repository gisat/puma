Ext.define('Puma.patch.Component', {
    override: 'Ext.Component',
    initComponent: function() {
        this.callParent();
        this.on('render',function(cmp) {
//            cmp.getEl().on('mousedown', this.onHelpClick, this, {
//                
//                stopEvent : true
//            });
        })
    },
    
    onHelpClick: function(a,b,c) {
        debugger
    }
})

