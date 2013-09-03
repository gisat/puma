Ext.define('PumaMain.view.MapTools', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.maptools',
    columns: 2,
    initComponent: function() { 
        this.defaults = {
            height: 60,
            width: 125
        }
        this.layout = {
            type: 'table',
            columns: 2
        }
        this.items = [{
            xtype: 'button',
            enableToggle: true,
            itemId: 'hoverbtn',
            text: 'Hover',
            cls: 'btn-tool-hover'
        },{
            xtype: 'button',
            itemId: 'zoomselectedbtn',
            text: 'Zoom selected',
            cls: 'btn-tool-zoom-selected'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurelinebtn',
            text: 'Measure line',
            cls: 'btn-tool-measure-line'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurepolygonbtn',
            text: 'Measure polygon',
            cls: 'btn-tool-measure-polygon'
        },{
            xtype: 'button',
            itemId: 'multiplemapsbtn',
            text: 'Multiple maps',
            cls: 'btn-tool-multiple-maps'
        },{
            xtype: 'button',
            text: 'Save as image',
            itemId: 'savemapbtn',
            cls: 'btn-tool-save-image'
        }]
        
        this.callParent();
        
    }
})

