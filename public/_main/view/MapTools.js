Ext.define('PumaMain.view.MapTools', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.maptools',
    columns: 2,
    initComponent: function() { 
        this.defaults = {
            height: 60,
            width: 189
        }
        this.layout = {
            type: 'table',
            columns: 2
        }
        this.items = [{
            xtype: 'button',
            enableToggle: true,
            text: 'Select in map'
        },{
            xtype: 'button',
            text: 'Snapshot'
        },{
            xtype: 'button',
            enableToggle: true,
            text: 'Select in map'
        },{
            xtype: 'button',
            text: 'Snapshot'
        },{
            xtype: 'button',
            enableToggle: true,
            text: 'Select in map'
        },{
            xtype: 'button',
            text: 'Snapshot'
        }]
        
        this.callParent();
        
    }
})

