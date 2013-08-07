Ext.define('PumaMain.view.LayerMenu', {
    extend: 'Ext.menu.Menu',
    alias: 'widget.layermenu',
    initComponent: function() {
        
        this.items = [{
            text: 'Opacity',
            hidden: this.layerName==null,
            itemId: 'opacity'
        },{
            text: 'Config',
            hidden: this.bindChart==null,
            itemId: 'config'
        },{
            text: 'Remove',
            hidden: this.bindChart==null,
            itemId: 'remove'
        }, {
            text: 'Export PNG',
            hidden: this.map==null,
            itemId: 'exportpng'
        }, {
            text: 'URL',
            hidden: this.map==null,
            itemId: 'url'
        }]
        this.callParent();
        
    }
})

