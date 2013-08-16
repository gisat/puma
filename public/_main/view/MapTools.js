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
            itemId: 'hoverbtn',
            text: 'Hover'
        },{
            xtype: 'button',
            itemId: 'zoomselectedbtn',
            
            text: 'Zoom selected'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurelinebtn',
            text: 'Measure line'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurepolygonbtn',
            text: 'Measure polygon'
        },{
            xtype: 'button',
            itemId: 'multiplemapsbtn',
            text: 'Multiple maps'
        },{
            xtype: 'button',
            text: 'Save as image'
        }]
        
        this.callParent();
        
    }
})

