Ext.define('PumaMain.view.CommonMngGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.commonmnggrid',
    autoScroll: true,
    requires: [],
    initComponent: function() {
        this.allowReorder = true;
        var me = this;
        this.columns = [{
                dataIndex: 'name',
                flex: 1,
                resizable: false,
                menuDisabled: true,
                sortable: false,
                text: 'Name',
            },
            {
                xtype: 'actioncolumn',
                width: this.allowReorder ? 65 : 25,
                items: [
                    {
                        icon: 'http://dummyimage.com/15x15/fdd/000&text=UP', // Use a URL in the icon config
                        tooltip: 'Up',
                        hidden: !this.allowReorder,
                        width: 15,
                        height: 20,
                        handler: function(grid, rowIndex, colIndex, item, e, record) {
                            me.fireEvent('recmoved', me, record, true)
                        }
                    },{
                        icon: 'http://dummyimage.com/15x15/fdd/000&text=DO', // Use a URL in the icon config
                        tooltip: 'Up',
                        hidden: !this.allowReorder,
                        width: 15,
                        height: 20,
                        handler: function(grid, rowIndex, colIndex, item, e, record) {
                            me.fireEvent('recmoved', me, record, false)
                        }
                    },{
                        icon: 'http://dummyimage.com/15x15/fdd/000&text=RE', // Use a URL in the icon config
                        tooltip: 'Remove',
                        width: 15,
                        height: 20,
                        handler: function(grid, rowIndex, colIndex, item, e, record) {
                            me.fireEvent('recdeleted', me, record)
                        }
                    }]}
        ]
        this.callParent();
        
        this.addEvents('recmoved','recdeleted');
    }
})


