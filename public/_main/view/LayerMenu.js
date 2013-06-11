Ext.define('PumaMain.view.LayerMenu', {
    extend: 'Ext.menu.Menu',
    alias: 'widget.layermenu',
    initComponent: function() {
        
        
        this.items = [{
            text: 'Opacity',
            itemId: 'opacity'
        }]
        this.callParent();
        
    }
})

