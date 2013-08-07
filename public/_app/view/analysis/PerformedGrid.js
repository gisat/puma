Ext.define('PumaMng.view.analysis.PerformedGrid', {
    extend: 'Puma.view.CommonGrid',
    alias: 'widget.performedanalysisgrid',
    requires: ['Ext.ProgressBar','Ext.grid.column.Date'],
    initComponent: function() {
        this.cls = 'analysis-grid';
        this.columns = [{
            dataIndex: 'analysis',
            flex: 1,
            header: 'Analysis',
            renderer: function(v) {
                if (!v) return '';
                var name = Ext.StoreMgr.lookup('analysis').getById(v).get('name');
                return name;
            }
        },{
            dataIndex: 'location',
            flex: 1,
            header: 'Location',
            renderer: function(v) {
                if (!v) return '';
                var name = Ext.StoreMgr.lookup('location').getById(v).get('name');
                return name;
            }
        },{
            dataIndex: 'year',
            flex: 1,
            header: 'Year',
            renderer: function(v) {
                if (!v) return '';
                var name = Ext.StoreMgr.lookup('year').getById(v).get('name');
                return name;
            }
        },{
            dataIndex: 'finished',
            header: 'Finished',
            xtype: 'datecolumn',
            width: 180,
            renderer: function(v, rec) {
                if (v) return Ext.util.Format.date(v);
                return "Performing analysis..."
//                var id = Ext.id();
//                
//                Ext.defer(function() {
//                    
//                    var p = Ext.widget('progressbar', {
//                        renderTo: id,
//                        value: 0,
//                        width: 160
//                    });
//                    p.wait({
//                        interval: 100, 
//                        increment: 30,
//                        text: 'Performing analysis...',
//                        scope: this
//                    });
//                }, 50);
//                return Ext.String.format('<div id="{0}"></div>', id);
            }
        }]
        this.buttons = [{
            text: 'Reload',
            itemId: 'reloadgridbtn'
        }]
        this.store = Ext.StoreMgr.lookup('performedanalysis');
        this.callParent();
    }
});


