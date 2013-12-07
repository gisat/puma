Ext.define('PumaMain.view.ScreenshotView', {
    extend: 'Ext.view.View',
    alias: 'widget.screenshotview',
    //height: 270,
    overItemCls: 'screenshotover',
    initComponent: function() {
        this.store = Ext.StoreMgr.lookup('screenshot');
        this.itemSelector = 'div.screenshot';
        this.style = {
            overflowY: 'auto'
        }
        this.tpl = [
            '<tpl for=".">',
            '<div class="screenshot" style="display:<tpl if="visible==1">inline-block<tpl else>none</tpl>;width:<tpl if="large">536px<tpl else>172px</tpl>;height:<tpl if="large">350px<tpl else>118px</tpl>">',
            '<img class="screenshotimg" height=<tpl if="large">350<tpl else>118</tpl> width=<tpl if="large">536<tpl else>172</tpl> src="{src}"/>',
            //'<img class="screenshotimg" src="{src}"/>',
            '<div>',
            '</div>',
            '<img class="screenshoticon screenshotpng" height=30 width=30 src="images/icons/snapshot-download.png" />',
            '<tpl if="!large"><img class="screenshoticon screenshotremove" height=30 width=30 src="images/icons/snapshot-delete.png" /></tpl>',    
            '<img class="screenshoticon screenshotenlarge" height=36 width=36 src="images/icons/snapshot-enlarge.png" />',    
            '</div>',
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


