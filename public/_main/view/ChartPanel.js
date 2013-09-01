Ext.define('PumaMain.view.ChartPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.chartpanel',
    layout: 'fit',
    frame: false,
    border: 0,
    padding: 0,
    initComponent: function() {
        
        
        var toolMap = {
            gear: {
                type: 'gear',
                tooltip: 'Settings'
            },
            close: {
                type: 'close',
                tooltip: 'Remove'
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
                toolNames = ['gear','close','collapse','print','save']; break;
            case 'piechart':
                toolNames = ['gear','close','help','print','save']; break;
            case 'columnchart':
                toolNames = ['gear','close','help','print','save']; break;
            case 'scatterchart':
                toolNames = ['gear','close','help','print','save','search']; break;
            case 'extentoutline':
                toolNames = ['gear','close','print','save']; break;
        }
        for (var i=0;i<toolNames.length;i++) {
            this.tools.push(toolMap[toolNames[i]]);
        }
        
        this.callParent();

    }
})


