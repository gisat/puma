Ext.define('PumaMain.view.ChartPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.chartpanel',
    layout: 'fit',
    frame: false,
    border: 0,
    collapseLeft: true,
    padding: 0,
    initComponent: function() {
        
        
        this.toolMap = {
            gear: {
                type: 'gear',
                helpId: 'Modifyingcharts',
                tooltip: 'Settings'
            },
            close: {
                type: 'close',
                helpId: 'Removingcharts',
                tooltip: 'Remove',
                cls: 'tool-chart-close'
            },
            help: {
                type: 'help',
                helpId: 'Displayingchartlegend',
                tooltip: 'Legend'
            },
            collapse: {
                type: 'collapse',
                helpId: 'Exportingchartsastables',
                tooltip: 'Export CSV'
            },
            search: {
                type: 'search',
                tooltip: 'Switch zooming',
                width: 22,
                height: 22
            },
            print: {
                type: 'print',
                helpId: 'Exportingchartsasgraphics',
                tooltip: 'Export PNG'
            },
            save: {
                type: 'save',
                helpId: 'Snapshots',
                tooltip: 'Snapshot'
            }
        }
        this.tools = [];
        
        var toolNames = ['gear','help','collapse','print','save','search','close'];
        for (var i=0;i<toolNames.length;i++) {
            this.tools.push(this.toolMap[toolNames[i]]);
        }
        this.callParent();
        this.updateToolVisibility();
    },
        
    updateToolVisibility: function() {
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
        for (var i=0;i<this.tools.length;i++) {
            var tool = this.tools[i];
            if (tool.type=='collapse-top' || tool.type=='expand-bottom') {
                    continue;
                }
            var vis = Ext.Array.contains(toolNames,tool.type);
            if (tool.rendered) {
                tool.setVisible(vis);
            }
            else if (!vis) {
                tool.hidden = true;
            }
        }
        
        
        
        var items = [{
            xtype: 'pumacombo',
            store: Ext.StoreMgr.lookup('attribute4set'),
            multiSelect: this.cfgType=='columnchart',
            attributeCombo: 1,
            cfgType: this.cfgType,
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
            cfgType: this.cfgType,
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


