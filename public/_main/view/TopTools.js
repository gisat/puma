Ext.define('PumaMain.view.TopTools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toptoolspanel',
    height: '100%',
    // to be removed
    width: 380,
    initComponent: function() {
        this.layout = {
            type: 'hbox'
        }    
        this.defaults = {
            height: '100%'
        }
        this.items = [{
            xtype: 'button',
            flex: 1,
            enableToggle: true,
            text: 'Select in map'
        },{
            xtype: 'button',
            flex: 1,
            text: 'Snapshot'
        }]
        
        this.callParent();
        
    }
})


