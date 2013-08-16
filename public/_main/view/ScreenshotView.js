Ext.define('PumaMain.view.ScreenshotView', {
    extend: 'Ext.view.View',
    alias: 'widget.screenshotview',
    height: 270,
    overItemCls: 'screenshotover',
    initComponent: function() {
        this.store = Ext.StoreMgr.lookup('screenshot');
        this.itemSelector = 'div.screenshot'
        this.tpl = [
            '<tpl for=".">',
            '<div class="screenshot">',
            '<img class="screenshotimg" height=120 width=175 src="{src}"/>',
            '<div>',
            '</div>',
            '<img class="screenshoticon screenshotpng" height=30 width=30 src="http://img.csfd.cz/documents/marketing/logos/icon-white-red/icon-white-red-small.png" />',
            '<img class="screenshoticon screenshotremove" height=30 width=30 src="http://img.csfd.cz/documents/marketing/logos/icon-white-red/icon-white-red-small.png" />',    
            '</div>',
            '</tpl>'
        ]
        this.callParent();
        var me = this;
        this.addEvents('screenshotexport','screenshotremove','screenshotexpand')
        this.on('itemclick', function(view,rec,c,d,e) {
            var className = e.target.className;
            if (className.contains('screenshotpng')) {
                me.fireEvent('screenshotexport',me,rec)
            }
            else if (className.contains('screenshotremove')) {
                me.fireEvent('screenshotremove',me,rec)
            }
            else {
                me.fireEvent('screenshotexpand',me,rec)
            }
        })
    }
})


