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
                tooltip: 'Snapshot'
            }
        }
        this.tools = [];
        var toolNames = [];
        switch (this.cfgType) {
            case 'grid':
                toolNames = ['collapse','print','save']; break;
            case 'piechart':
                toolNames = ['help','collapse','print','save']; break;
            case 'columnchart':
                toolNames = ['help','collapse','print','save']; break;
            case 'scatterchart':
                toolNames = ['help','collapse','print','save','search']; break;
            case 'extentoutline':
                toolNames = ['gear','print','save','close']; break;
            case 'filter':
                toolNames = ['close']; break;
        }
        for (var i=0;i<toolNames.length;i++) {
            this.tools.push(toolMap[toolNames[i]]);
        }
        
        
        
        var items = [{
            xtype: 'pumacombo',
            store: Ext.StoreMgr.lookup('attribute4set'),
            multiSelect: this.cfgType=='columnchart',
            attributeCombo: 1,
            listConfig: {
                selModel: {
                    mode: 'MULTI'
                }
            },
            height: 30,
//            cls: 'custom-combo',
            flex: 1
//            ,
//            listConfig: {
//                cls: 'custom-combo-list',
//            }
        },{
            xtype: 'pumacombo',
            store: Ext.StoreMgr.lookup('attribute4set'),
            multiSelect: this.cfgType=='columnchart',
            attributeCombo: 1,
            alternative: this.cfgType=='scatterchart',
            listConfig: {
                selModel: {
                    mode: 'MULTI'
                }
            },
            height: 30,
//            cls: 'custom-combo',
            flex: 1
//            ,
//            listConfig: {
//                cls: 'custom-combo-list',
//            }
        }]
        if (this.cfgType!='scatterchart') {
            items = items.slice(1);
        }
        
        if (this.cfgType!='grid') {
            this.tbar = items
        }
        
        
        
        this.callParent();

    }
})


