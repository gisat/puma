Ext.define('PumaMain.view.Chart', {
    extend: 'Ext.Component',
    alias: 'widget.chartcmp',
    colspan: 2,
    margin: '5 5 5 0',
    border: 0,
    autoScroll: true,
    width: 575,
    height: 400,
    initComponent: function() {
//        this.tbar = [
//            {xtype: 'button',text: 'CFG'},
//            {xtype: 'button',text: 'Remove'}
//        ]
        
        this.callParent();
        
    }
})


