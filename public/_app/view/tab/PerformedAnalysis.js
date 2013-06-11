Ext.define('PumaMng.view.tab.PerformedAnalysis' ,{
    extend: 'Ext.panel.Panel',
    alias : 'widget.performedanalysistab',
    requires: ['PumaMng.view.analysis.PerformedGrid','PumaMng.view.analysis.PerformedForm'],
    padding: 5,
    autoScroll: true,

    initComponent: function() {
        this.layout = {
            type: 'hbox',
            align: 'middle',
            pack: 'start'
        }
        this.items = [{
            xtype: 'performedanalysisgrid',
            height: 600,
            frame: true,
            width: 520,
            padding: 10,
            margin: '0 30 0 30'
        }, {
            xtype: 'performedanalysisform',
            height: 600,
            frame: true,
            width: 380,
            padding: 10,
        }]
        this.callParent();
    }
})


