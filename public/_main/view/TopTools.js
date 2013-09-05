Ext.define('PumaMain.view.TopTools', {
    extend: 'Ext.container.Container',
    alias: 'widget.toptoolspanel',
    height: '100%',
    // to be removed
    width: '100%',
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
            toggleGroup: 'mapmodal',
            itemId: 'selectinmapbtn',
            text: 'Select in map',
            icon: 'images/icons/map-select.png',
            cls: 'custom-button btn-map-select'
        },{
            xtype: 'button',
            flex: 1,
            text: 'Snapshot',
            icon: 'images/icons/snapshot.png',
            itemId: 'mapsnapshotbtn',
            cls: 'custom-button btn-snapshot'
        }]
        
        this.callParent();
        
    }
})


