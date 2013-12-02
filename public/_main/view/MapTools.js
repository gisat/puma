Ext.define('PumaMain.view.MapTools', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.maptools',
    columns: 2,
    helpId: 'Maptools',
    initComponent: function() { 
        this.defaults = {
            height: 90,
            width: 120
        }
        this.layout = {
            type: 'table',
            columns: 2
        }
        this.items = [{
            xtype: 'button',
            enableToggle: true,
            itemId: 'hoverbtn',
            helpId: 'xhelp31',
            text: 'Hover',
            iconAlign: 'top',
            icon: 'images/icons/tools-hover.png',
            cls: 'custom-button btn-map-tool btn-tool-hover'
        },{
            xtype: 'button',
            itemId: 'zoomselectedbtn',
            helpId: 'xhelp32',
            text: 'Zoom selected',
            iconAlign: 'top',
            icon: 'images/icons/tools-zoom.png',
            cls: 'custom-button btn-map-tool btn-tool-zoom-selected'
        },{
            xtype: 'button',
            enableToggle: true,
            helpId: 'xhelp33',
            toggleGroup: 'mapmodal',
            itemId: 'measurelinebtn',
            text: 'Measure line',
            iconAlign: 'top',
            icon: 'images/icons/tools-measure-line.png',
            cls: 'custom-button btn-map-tool btn-tool-measure-line'
        },{
            xtype: 'button',
            enableToggle: true,
            toggleGroup: 'mapmodal',
            itemId: 'measurepolygonbtn',
            helpId: 'xhelp34',
            text: 'Measure polygon',
            iconAlign: 'top',
            icon: 'images/icons/tools-measure-polygon.png',
            cls: 'custom-button btn-map-tool btn-tool-measure-polygon'
        },{
            xtype: 'button',
            itemId: 'multiplemapsbtn',
            helpId: 'xhelp35',
            enableToggle: true,
            disabled: true,
            //hidden: true,
            text: 'Multiple maps',
            iconAlign: 'top',
            icon: 'images/icons/tools-maps-multiple.png',
            cls: 'custom-button btn-map-tool btn-tool-multiple-maps'
        },{
            xtype: 'button',
            text: 'Save as image',
            itemId: 'savemapbtn',
            helpId: 'xhelp36',
            icon: 'images/icons/tools-save.png',
            iconAlign: 'top',
            cls: 'custom-button btn-map-tool btn-tool-save-image'
        }]
        
        this.callParent();
        
    }
})

