Ext.define('Puma.patch.picker.Color', {
    override: 'Ext.picker.Color',
    select: function(color, suppressEvent) {
        
        var me = this,
                selectedCls = me.selectedCls,
                value = me.value,
                el;

        color = color.replace('#', '').toLowerCase();
        if (!me.rendered) {
            me.value = color;
            return;
        }
        if (me.allowToggle) {
            value = (value && value.length) ? value : [];
            el = me.el;
            if (Ext.Array.contains(value,color)) {
                el.down('a.color-' + color).removeCls(selectedCls);
                value = Ext.Array.difference(value,[color])
            }
            else {
                el.down('a.color-' + color).addCls(selectedCls);
                Ext.Array.include(value,color)
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

