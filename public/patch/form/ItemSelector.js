Ext.define('Puma.patch.form.ItemSelector', {
    override: 'Ext.ux.form.ItemSelector',
    initComponent: function() {
        this.callParent();
        this.store.on('refresh',this.onDataChanged,this);
    },
        
    onDataChanged: function() {
        var value = this.getValue() || [];
        if (!this.store) return;
        var storeValues = this.store.collect(this.valueField);
        var newValue = Ext.Array.intersect(value,storeValues);
        var me = this;
        window.setTimeout(function() {
            me.bindStore(me.store);
            me.setValue(newValue);  
        },1)
    }
})


