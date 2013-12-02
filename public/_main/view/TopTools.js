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
            helpId: 'Selectingunitsinmap',
            text: 'Select in map',
            icon: 'images/icons/map-select.png',
            cls: 'custom-button btn-map-select',
            listeners : {
                toggle : {
                    fn : function(btn, active) {
                        if (active) {
                            btn.addCls("toggle-active");
                        }
                        else {
                            btn.removeCls("toggle-active");
                        }
                    }
                }
            }
        },{
            xtype: 'button',
            flex: 1,
            text: 'Snapshot',
            icon: 'images/icons/snapshot.png',
            itemId: 'mapsnapshotbtn',
            helpId: 'Creatingsnapshots',
            cls: 'custom-button btn-snapshot'
        }]
        
        this.callParent();
        
    }
})


