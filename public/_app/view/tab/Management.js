Ext.define('PumaMng.view.tab.Management' ,{
    extend: 'Ext.panel.Panel',
    alias : 'widget.managementtab',
    requires: ['Puma.view.CommonGrid'],
    padding: 5,
    autoScroll: true,

    initComponent: function() {
        this.layout = {
            type: 'hbox',
            align: 'middle',
            pack: 'start'
        }
        this.defaults = {
            width: 420
        }
        this.items = [{
            xtype: 'grid',
            height: 600,
            store: Ext.StoreMgr.lookup('objecttype'),
            itemId: 'objecttypegrid',
            frame: true,
            width: 280,
            padding: 10,
            columns: [{
                dataIndex: 'name',
                flex: 1,
                header: 'Type'
            }],
            margin: '0 30 0 30'
        }, {
            xtype: 'commongrid',
            height: 600,
            itemId: 'objectgrid',
            width: 390,
            store: Ext.StoreMgr.lookup('blank'),
            frame: true,
            
            buttons: [{
                text: 'Get from server',
                hidden: true,
                itemId: 'getfromserverbtn'
            }],
            margin: '0 30 0 0'
        }]
        this.callParent();
    }
})


