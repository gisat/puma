Ext.define('PumaMain.view.ChartBar', {
    extend: 'Ext.container.Container',
    alias: 'widget.chartbar',
    requires: ['PumaMain.view.ScreenshotView'],
    autoScroll: true,
    //overflowY: 'scroll',
    height:"100%",
    initComponent: function() {

        this.layout = {
            type: 'accordion',
            multi: true,
            fill: false
        }
        this.items = [
            {
                xtype: 'panel',
                collapsed: false,
                layout: 'fit',
                iconCls: 'cmptype-snapshot',
                collapseLeft: true,
                //hidden: true,
                itemId: 'screenshotpanel',
                helpId: 'Snapshots',
                items: [{
                    xtype: 'screenshotview'
                }],
                cfgType: 'screenshots',  
                height: 400,
                title: 'Snapshots'
            }
//            ,
//            {
//                xtype: 'panel',
//                collapsed: true,
//                cfgType: 'add',
//                helpId: 'Addingnewcharts',
//                iconCls: 'cmptype-addchart',
//                leftSpace: 25,
//                hideCollapseTool: true,
//                title: 'Add chart'
//            }
        ]
        this.callParent();
    }
})


