Ext.define('PumaMain.view.ChoroplethForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.choroplethform',
    frame: true,
    header: false,
    initComponent: function() {
        this.bodyStyle = {
            padding: '0px'
        }
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
                value: 5,
                minValue: 2,
                allowDecimals: false,
                itemId: 'numCategories'
            }
//            ,{
//                xtype: 'checkbox',
//                forChoro: 1,
//                fieldLabel: 'Zeroes as null',
//                name: 'zeroesAsNull',
//                itemId: 'zeroesAsNull'
//            }
        ]
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


