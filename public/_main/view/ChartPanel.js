Ext.define('PumaMain.view.ChartPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.chartpanel',
    layout: 'fit',
    frame: false,
    border: 0,
    collapseLeft: true,
    padding: 0,
    initComponent: function() {
        
        
        var toolMap = {
            gear: {
                type: 'gear',
                tooltip: 'Settings'
            },
            close: {
                type: 'close',
                tooltip: 'Remove',
                cls: 'tool-chart-close'
            },
            help: {
                type: 'help',
                tooltip: 'Legend'
            },
            collapse: {
                type: 'collapse',
                tooltip: 'Export CSV'
            },
            search: {
                type: 'search',
                tooltip: 'Switch zooming'
            },
            print: {
                type: 'print',
                tooltip: 'Export PNG'
            },
            save: {
                type: 'save',
                tooltip: 'Screenshot'
            }
        }
        this.tools = [];
        var toolNames = [];
        switch (this.cfgType) {
            case 'grid':
                toolNames = ['gear','collapse','print','save','close']; break;
            case 'piechart':
                toolNames = ['gear','help','print','save','close']; break;
            case 'columnchart':
                toolNames = ['gear','help','print','save','close']; break;
            case 'scatterchart':
                toolNames = ['gear','help','print','save','search','close']; break;
            case 'extentoutline':
                toolNames = ['gear','print','save','close']; break;
        }
        for (var i=0;i<toolNames.length;i++) {
            this.tools.push(toolMap[toolNames[i]]);
        }
        
        this.callParent();

    }
})


