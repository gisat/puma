Ext.define('PumaMain.view.ChartBar', {
    extend: 'Ext.container.Container',
    alias: 'widget.chartbar',
    requires: ['PumaMain.view.ScreenshotView'],
    autoScroll: true,
    maxHeight: 760,
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
                items: [{
                    xtype: 'screenshotview'
                }],
                cfgType: 'screenshots',              
                title: 'Screenshots'
            },
            {
                xtype: 'panel',
                collapsed: true,
                cfgType: 'add',
                title: 'Add chart'
            }
        ]
        this.callParent();
    }
})


