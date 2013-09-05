Ext.define('PumaMain.view.AddAttributeGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.addattributegrid',
    colspan: 2,
    border: 0,
    header: false,
    autoScroll: true,
    requires: ['Ext.ux.CheckColumn','Ext.ux.grid.filter.StringFilter'],
    initComponent: function() {
        var filters = {
        ftype: 'filters',
        local: true
        };
        this.store = Ext.StoreMgr.lookup('attributes2choose')
        this.columns = [{
            xtype: 'checkcolumnwithheader',
            store: this.store,
            columnHeaderCheckbox: true,
            width: 40,
            menuDisabled: true,
            filterable: false,
            resizable: false,
            dataIndex: 'checked'
        },{
            dataIndex: 'attrName',
            flex: 1,
            resizable: false,
            text: 'Attribute',
            filter: {
                type: 'string'
            }
        },{
            dataIndex: 'asName',
            flex: 1,
            resizable: false,
            text: 'Attribute set',
            filter: {
                type: 'string'
            }
        }]
        this.buttons = [{
            text: 'Add',
            itemId: 'add'
        },{
            itemId: 'back',
            text: 'Back'
        }]
        this.enableColumnHide = false;
        this.features = [filters]
        this.callParent();
        
    }
})


