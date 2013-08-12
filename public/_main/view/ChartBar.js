Ext.define('PumaMain.view.ChartBar', {
    extend: 'Ext.container.Container',
    alias: 'widget.chartbar',
    requires: [],
    initComponent: function() {

        this.layout = {
            type: 'accordion',
            multi: true,
            fill: false,
        }
        this.items = [
            {
                xtype: 'panel',
                height: 50,
                title: 'Screenshots'
            },
            {
                xtype: 'panel',
                collapsed: true,
                title: 'Add chart'
            }
        ]
        this.callParent();
    }
})


