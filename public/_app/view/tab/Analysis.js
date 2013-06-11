Ext.define('PumaMng.view.tab.Analysis' ,{
    extend: 'Ext.panel.Panel',
    alias : 'widget.analysistab',
    requires: [],
    padding: 5,
    autoScroll: true,

    initComponent: function() {
        this.layout = {
            type: 'hbox',
            align: 'middle',
            pack: 'start'
        }
        this.defaults = {
            width: 650
        }
        this.items = [{
            xtype: 'grid',
            height: 600,
            store: Ext.StoreMgr.lookup('analysistype'),
            itemId: 'analysistypegrid',
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
            itemId: 'analysisgrid',
            width: 360,
            disableFilter: true,
            store: Ext.StoreMgr.lookup('analysismng'),
            frame: true,
            margin: '0 30 0 0'
        }]
        this.callParent();
    }
})


