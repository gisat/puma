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
                collapsed: true,
                layout: {
                    type: 'fit'
                },
                iconCls: 'cmptype-snapshot',
                collapseLeft: true,
                //hidden: true,
                itemId: 'screenshotpanel',
                helpId: 'Snapshots',
                items: [{
                    xtype: 'screenshotview',
                    
                }],
                cfgType: 'screenshots',  
                height: 400,
                
                title: 'Snapshots'
            },
            {
                xtype: 'panel',
                title: 'Regions',
                itemId: 'regionspanel',
                iconCls: 'cmptype-extentoutline',
                collapseLeft: true,
                collapsed: true,
                layout: {
                    type: 'absolute'
                },
                defaults: {
                    xtype: 'component',
                    type: 'distantregion',
                    width: 264,
                    height: 200
                },
                items: [
                    {anchor:'50% 33%',x:0,y:0,zoomTo:[-32,35,-24,41]},
                    {anchor:'100% 33%',x:285,y:0,zoomTo:[-20,25,-12,31]},
                    {anchor:'50% 66%',x:0,y:203,zoomTo:[-21,30,-13,36]},
                    {anchor:'100% 66%',x:285,y:203,zoomTo:[52,-24,60,-18]},
                    {anchor:'50% 100%',x:0,y:406,zoomTo:[-57,1,-49,7]},
                    {anchor:'100% 66%',x:285,y:406,zoomTo:[-66,13,-58,19]}
                ]
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


