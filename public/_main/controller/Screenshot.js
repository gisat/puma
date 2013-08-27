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
                })
    },
    onScreenshotRemove: function(view, rec) {
        rec.destroy();
    },
    onScreenshotExpand: function(view, rec, el) {
        debugger;
        //var childs = el.parent().select('.screenshot').removeElement(el);
        //childs.enableDisplayMode().hide();
        var isLarge = rec.get('large') ? true : false;
        Ext.StoreMgr.lookup('screenshot').each(function(r) {
            if (r==rec) {
                rec.set('large',!isLarge)
            }
            else {
                rec.set('visible',isLarge);
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
        this.getController('Chart').onUrlCallback(id, true);
    }
})
    


