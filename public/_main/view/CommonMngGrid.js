Ext.define('PumaMain.view.CommonMngGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.commonmnggrid',
    autoScroll: true,
    requires: [],
    initComponent: function() {
        var me = this;

        var actionItems = [
            {
                icon: 'images/icons/up.png', // Use a URL in the icon config
                tooltip: 'Up',
                hidden: !this.allowReorder,
                width: 16,
                height: 16,
                handler: function(grid, rowIndex, colIndex, item, e, record) {
                    me.fireEvent('recmoved', me, record, true)
                }
            }, {
                icon: 'images/icons/down.png', // Use a URL in the icon config
                tooltip: 'Down',
                hidden: !this.allowReorder,
                width: 16,
                height: 16,
                handler: function(grid, rowIndex, colIndex, item, e, record) {
                    me.fireEvent('recmoved', me, record, false)
                }
            },
            {
                icon: 'images/icons/view.png', // Use a URL in the icon config
                tooltip: 'Open',
                hidden: this.allowReorder ? true: false,
                width: 16,
                height: 16,
                handler: function(grid, rowIndex, colIndex, item, e, record) {
                    me.fireEvent('urlopen', me, record)
                }
            },
            {
                icon: 'images/icons/remove-16.png', // Use a URL in the icon config
                tooltip: 'Remove',
                width: 16,
                height: 16,
                handler: function(grid, rowIndex, colIndex, item, e, record) {
                    me.fireEvent('recdeleted', me, record)
                }
            }]
        if (!me.allowReorder) {
            actionItems = actionItems.slice(2);
        }
        else {
            actionItems = [actionItems[0],actionItems[1],actionItems[3]]
        }

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
                width: this.allowReorder ? 72 : 50,
                items: actionItems}
        ]
        this.callParent();

        this.addEvents('recmoved', 'recdeleted','urlopen');
    }
})


