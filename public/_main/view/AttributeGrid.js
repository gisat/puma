Ext.define('PumaMain.view.AttributeGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.attributegrid',
    colspan: 2,
    border: 0,
    autoScroll: true,
    requires: ['Ext.ux.CheckColumn'],
    initComponent: function() {
        this.columns = [{
            xtype: 'checkcolumnwithheader',
            store: this.store,
            columnHeaderCheckbox: true,
            width: 40,
            menuDisabled: true,
            resizable: false,
            dataIndex: 'checked'
        },{
            dataIndex: 'attrName',
            flex: 1,
            resizable: false,
            menuDisabled: true,
            text: 'Attribute',
            renderer: function(value,metadata,record) {
                if (record.get('normType')) {
                    value += ' (normalized)';
                }
                return value;
            },
            filter: {
                type: 'string'
            }
        },{
            dataIndex: 'asName',
            flex: 1,
            resizable: false,
            menuDisabled: true,
            text: 'Attribute set',
            filter: {
                type: 'string'
            }
        }]
        this.tbar = [{
            xtype: 'button',
            itemId: 'add',
            text: 'Add'    
        },{
            xtype: 'button',
            itemId: 'remove',
            text: 'Remove'
        },{
            xtype: 'button',
            itemId: 'normalize',
            text: 'Normalize'
        },{
            xtype: 'button',
            hidden: this.formType!='layers',
            itemId: 'choroplethparams',
            text: 'Choropleth params'
        }]
        this.viewConfig = {
            plugins: {
                ptype: 'gridviewdragdrop'
            }
        }
        this.callParent();
        
    }
})


