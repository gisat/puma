Ext.define('Gisatlib.slider.DiscreteThumb', {
    extend: 'Ext.slider.Thumb',
    alias: 'widget.discretethumb',
    initEvents: function() {
        var me = this;
        this.el.on('click',function(evt) {
            var el = this;
            var unchanged = false;
            var removed = false;
            var cont = el.up('.'+Ext.baseCSSPrefix +'slider-inner');
            if (evt.ctrlKey) {
                el.toggleCls(Ext.baseCSSPrefix + 'slider-thumb-drag')
                var thumbEls = cont.query('.'+Ext.baseCSSPrefix + 'slider-thumb');
                if (!thumbEls.length) {
                    el.toggleCls(Ext.baseCSSPrefix + 'slider-thumb-drag');
                    unchanged = true;
                }
            }
            else {
                
                var thumbEls = cont.query('.'+Ext.baseCSSPrefix + 'slider-thumb');
                for (var i=0;i<thumbEls.length;i++) {
                    var thumbEl = Ext.get(thumbEls[i]);
                    var hasCls = thumbEl.hasCls(Ext.baseCSSPrefix + 'slider-thumb-drag')
                    if (el==thumbEl) {
                        thumbEl.addCls(Ext.baseCSSPrefix + 'slider-thumb-drag');
                        if (hasCls) {
                            unchanged = true;
                        }
                    }
                    else {
                        thumbEl.removeCls(Ext.baseCSSPrefix + 'slider-thumb-drag');
                        removed = true;
                    }
                }
            }
            if (!unchanged || removed) {
                me.slider.fireEvent('change',me.slider,me.slider.getValue(),me)
            }
        })
    }

    
    
})


