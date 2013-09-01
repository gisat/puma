Ext.define('PumaMain.view.ChoroplethForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.choroplethform',
    frame: true,
    initComponent: function() {
        this.items = [ {
                xtype: 'pumacombo',
                forChoro: 1,
                store: Ext.StoreMgr.lookup('classificationtype'),
                fieldLabel: 'Class. type',
                itemId: 'classType',
                name: 'classType',
                value: 'quantiles',
                valueField: 'type'
            },{
                xtype: 'numberfield',
                fieldLabel: 'Num categories',
                name: 'numCategories',
                forChoro: 1,
                value: 3,
                allowDecimals: false,
                itemId: 'numCategories'
            }, {
                xtype: 'checkbox',
                forChoro: 1,
                fieldLabel: 'Zeroes as null',
                name: 'zeroesAsNull',
                itemId: 'zeroesAsNull'
            }]
        this.buttons = [{
                text: 'Apply',
                itemId: 'apply'
            }, {
                text: 'Back',
                itemId: 'back'
            }]
        this.callParent();

    }
})


