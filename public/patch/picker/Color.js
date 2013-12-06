Ext.define('Puma.patch.picker.Color', {
    override: 'Ext.picker.Color',
    select: function(color, suppressEvent) {
        
        var me = this,
                selectedCls = me.selectedCls,
                value = me.value,
                el;
        
        if (!me.rendered) {
            if (me.allowToggle && Ext.isArray(color)) {
                
               me.xValue = [];
               me.value = [];
                for (var i=0;i<color.length;i++) {
                   var partColor = color[i];
                   partColor = partColor.replace('#', '').toLowerCase();
                   Ext.Array.include(me.xValue,partColor);
               } 
            }
            else {
               
               color = color.replace('#', '').toLowerCase();
               me.value = color;
            }
           
            return;
        }
        if (Ext.isArray(color)) {
            color = null;
        }
        else {
            color = color.replace('#', '').toLowerCase();
        }
        if (me.allowToggle) {
            
            value = me.xValue || ((value && Ext.isArray(value)) ? value : []);
            me.xValue = null;
            if (Ext.Array.contains(value,color) && color) {
                value = Ext.Array.difference(value,[color])
            }
            else if (color) {
                Ext.Array.include(value,color)
            }
            el = me.el;
            
            for (var i=0;i<me.colors.length;i++) {
                var partColor = me.colors[i];
                if (Ext.Array.contains(value,partColor)) {
                    el.down('a.color-' + partColor).addCls(selectedCls);
                }
                else {
                    el.down('a.color-' + partColor).removeCls(selectedCls);
                }
            }
            
            me.value = value;
            if (suppressEvent !== true) {
                me.fireEvent('select', me, value);
            }
        } 
        

        else if (color != value || me.allowReselect) {
            el = me.el;
            
            if (me.value) {
                el.down('a.color-' + value).removeCls(selectedCls);
            }
            el.down('a.color-' + color).addCls(selectedCls);
            me.value = color;
            if (suppressEvent !== true) {
                me.fireEvent('select', me, color);
            }
        }
    }
})

