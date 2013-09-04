Ext.define('PumaMain.view.MapTools', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.maptools',
    columns: 2,
    initComponent: function() { 
        this.defaults = {
            height: 90,
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
            iconAlign: 'top',
            icon: 'images/icons/tools-hover.png',
            cls: 'btn-map-tool btn-tool-hover'
        },{
            xtype: 'button',
            itemId: 'zoomselectedbtn',
            text: 'Zoom selected',
            iconAlign: 'top',
            icon: 'images/icons/tools-zoom.png',
            cls: 'btn-map-tool btn-tool-zoom-selected'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurelinebtn',
            text: 'Measure line',
            iconAlign: 'top',
            icon: 'images/icons/tools-measure-line.png',
            cls: 'btn-map-tool btn-tool-measure-line'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurepolygonbtn',
            text: 'Measure polygon',
            iconAlign: 'top',
            icon: 'images/icons/tools-measure-polygon.png',
            cls: 'btn-map-tool btn-tool-measure-polygon'
        },{
            xtype: 'button',
            itemId: 'multiplemapsbtn',
            text: 'Multiple maps',
            iconAlign: 'top',
            icon: 'images/icons/tools-maps-multiple.png',
            cls: 'btn-map-tool btn-tool-multiple-maps'
        },{
            xtype: 'button',
            text: 'Save as image',
            itemId: 'savemapbtn',
            icon: 'images/icons/tools-save.png',
            iconAlign: 'top',
            cls: 'btn-map-tool btn-tool-save-image'
        }]
        
        this.callParent();
        
    }
})

