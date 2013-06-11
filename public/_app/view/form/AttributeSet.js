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
                height: 170
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activetopic'),
                fieldLabel: 'Topic',
                name: 'topic',
                itemId: 'topic'
            },{
                xtype: 'pumacombo',
                store: Ext.StoreMgr.lookup('activefeaturelayer'),
                fieldLabel: 'Feature layer',
                name: 'featureLayer',
                itemId: 'featureLayer'
            }];

        this.callParent();
    }
})


