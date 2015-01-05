Ext.define('PumaMng.view.form.AttributeSet', {
    extend: 'PumaMng.view.form.Common',
    alias: 'widget.attributesetform',
    requires: ['Puma.view.form.DefaultComboBox'],
    model: 'AttributeSet',
    initComponent: function() {


        this.items = [{
                xtype: 'itemselector',
                store: Ext.StoreMgr.lookup('activeattribute'),
                valueField: '_id',
                fieldLabel: 'Attributes',
                name: 'attributes',
                itemId: 'attributes',
                displayField: 'name',
                allowBlank: true,
                height: 170
            },{
                xtype: 'itemselector',
                store: Ext.StoreMgr.lookup('activeattribute'),
                valueField: '_id',
                fieldLabel: 'Filter Attributes',
                name: 'filterAttributes',
                itemId: 'filterAttributes',
                displayField: 'name',
                allowBlank: true,
                height: 170
            },{
                xtype: 'itemselector',
                store: Ext.StoreMgr.lookup('activeattribute'),
                valueField: '_id',
                fieldLabel: 'Other attributes',
                name: 'otherAttributes',
                itemId: 'otherAttributes',
                displayField: 'name',
                allowBlank: true,
                height: 170
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activedataset'),
                fieldLabel: 'Dataset',
                allowBlank: false,
                name: 'dataset',
                itemId: 'dataset'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activetopic'),
                fieldLabel: 'Topic',
                allowBlank: false,
                name: 'topic',
                itemId: 'topic'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activeyear'),
                multiSelect: true,
                fieldLabel: 'Years',
                allowBlank: true,
                name: 'years',
                itemId: 'Years'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activeyear'),
                fieldLabel: 'Year',
                allowBlank: true,
                name: 'year',
                itemId: 'year'
            }];

        this.callParent();
    }
})


