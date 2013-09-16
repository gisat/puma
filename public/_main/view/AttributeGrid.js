Ext.define('PumaMain.view.AttributeGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.attributegrid',
    colspan: 2,
    border: 0,
    autoScroll: true,
    header: false,
    requires: ['Ext.ux.CheckColumn','Ext.grid.plugin.CellEditing'],
    initComponent: function() {
        this.editing = Ext.create('Ext.grid.plugin.CellEditing');
        this.plugins = [this.editing];
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
            flex: 3,
            resizable: false,
            menuDisabled: true,
            text: 'Attribute'
//            ,
//            renderer: function(value,metadata,record) {
//                if (record.get('normType')) {
//                    value += ' (normalized)';
//                }
//                return value;
//            }
        },{
            dataIndex: 'asName',
            flex: 3,
            resizable: false,
            menuDisabled: true,
            text: 'Attribute set'
        },{
            dataIndex: 'normType',
            flex: 2,
            resizable: false,
            menuDisabled: true,
            formType: this.formType,
            text: 'Normalization',
            renderer: function(value,metadata,record) {
                var store = Ext.StoreMgr.lookup('normalization4chart');
                var rec = store.findRecord('type',value)
                return rec ? rec.get('name') : '';
            }
        },{
            dataIndex: 'classType',
            flex: 2,
            hidden: this.formType!='layers',
            resizable: false,
            menuDisabled: true,
            text: 'Classification',
            renderer: function(value,metadata,record) {
                value = value || 'quantiles'
                var store = Ext.StoreMgr.lookup('classificationtype');
                var rec = store.findRecord('type',value)
                return rec ? rec.get('name') : '';
            }
        },{
            dataIndex: 'numCategories',
            flex: 1,
            hidden: this.formType!='layers',
            resizable: false,
            menuDisabled: true,
            text: 'Cat.',
            renderer: function(value,metadata,record) {
                value = value || 5;
                return value;
            }
        },{
            dataIndex: 'name',
            flex: 3,
            hidden: this.formType!='layers',
            resizable: false,
            menuDisabled: true,
            text: 'Name',
            field: {
                    type: 'textfield'
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
            disabled: this.formType=='filters',
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


