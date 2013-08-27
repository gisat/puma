Ext.define('PumaMain.view.ScreenshotView', {
    extend: 'Ext.view.View',
    alias: 'widget.screenshotview',
    //height: 270,
    overItemCls: 'screenshotover',
    initComponent: function() {
        this.store = Ext.StoreMgr.lookup('screenshot');
        this.itemSelector = 'div.screenshot'
        this.tpl = [
            '<tpl for=".">',
            '<tpl if="visible">',
            '<div class="screenshot" style="width:<tpl if="large">550px<tpl else>180px</tpl>;height:<tpl if="large">360px<tpl else>120px</tpl>">',
            '<img class="screenshotimg" height=<tpl if="large">360<tpl else>120</tpl>width=<tpl if="large">550<tpl else>180</tpl> src="{src}"/>',
            '<div>',
            '</div>',
            '<img class="screenshoticon screenshotpng" height=30 width=30 src="http://img.csfd.cz/documents/marketing/logos/icon-white-red/icon-white-red-small.png" />',
            '<img class="screenshoticon screenshotremove" height=30 width=30 src="http://img.csfd.cz/documents/marketing/logos/icon-white-red/icon-white-red-small.png" />',    
            '</div>',
            '</tpl>',
            '</tpl>'
        ]
        this.callParent();
        var me = this;
        this.addEvents('screenshotexport','screenshotremove','screenshotexpand')
        this.on('itemclick', function(view,rec,domEl,d,e) {
            var className = e.target.className;
            if (className.indexOf('screenshotpng')>-1) {
                me.fireEvent('screenshotexport',me,rec)
            }
            else if (className.indexOf('screenshotremove')>-1) {
                me.fireEvent('screenshotremove',me,rec)
            }
            else {
                me.fireEvent('screenshotexpand',me,rec,Ext.get(domEl))
            }
        })
    }
})


