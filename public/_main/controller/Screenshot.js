Ext.define('PumaMain.controller.Screenshot', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    "screenshotview": {
                        screenshotremove: this.onScreenshotRemove,
                        screenshotexpand: this.onScreenshotExpand,
                        screenshotexport: this.onScreenshotExport
                    },
                    'chartbar #screenshotpanel': {
                        afterrender: this.onPanelReady
                    }
                })
        $(document).on('load','.screenshotimg', function() {
            debugger;
        })
    },
    onPanelReady: function(panel) {
        //panel.expand();
        window.setTimeout(function() {
            panel.hide()
        },100);
        
    },
    onScreenshotRemove: function(view, rec) {
        
        if (rec.get('large')) return;
        rec.destroy();
        
        var count = Ext.StoreMgr.lookup('screenshot').getCount();
        if (count<1) {
            var snapshotPanel = Ext.ComponentQuery.query('chartbar #screenshotpanel')[0];
            snapshotPanel.hide();
        }
    },
    onScreenshotExpand: function(view, rec, el) {
        var isLarge = rec.get('large') ? true : false;
        Ext.StoreMgr.lookup('screenshot').each(function(r) {
            if (r==rec) {
                r.set('large',!isLarge);
            }
            else {
                r.set('visible',isLarge ? 1 : 0);
            }
        })
        Ext.ComponentQuery.query('screenshotview')[0].refresh()
        //el.setSize(550,360);
        
        //rec.set('width',550)
       // rec.set('height',360);
    },
    onScreenshotExport: function(view, rec) {
        var url = rec.get('src');
        var id = url.split('id=')[1];
        Puma.util.Msg.msg('Snapshot creation started','','r');
        this.getController('Chart').onUrlCallback(id, true);
    }
})
    


