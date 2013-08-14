Ext.define('PumaMain.view.ChartBar', {
    extend: 'Ext.container.Container',
    alias: 'widget.chartbar',
    requires: [],
    autoScroll: true,
    maxHeight: 780,
    initComponent: function() {

        this.layout = {
            type: 'accordion',
            multi: true,
            fill: false,
        }
        this.items = [
            {
                xtype: 'panel',
                collapsed: true,
                cfgType: 'screenshots',
                //height: 50,               
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


