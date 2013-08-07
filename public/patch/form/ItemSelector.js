Ext.define('Puma.patch.form.ItemSelector', {
    override: 'Ext.ux.form.ItemSelector',
    initComponent: function() {
        this.callParent();
        this.store.on('refresh',this.onDataChanged,this);
    },
        
    onDataChanged: function() {
        if (!this.store) return;
        
        
        var me = this;
        window.setTimeout(function() {
            var value = me.value || [];
            var storeValues = me.store.collect(me.valueField);
            var newValue = Ext.Array.intersect(value,storeValues);
            me.bindStore(me.store);
            me.setValue(newValue);  
        },1)
    },
        
    onBindStore: function(store, initial) {
        var me = this;

        if (me.fromField) {
            me.fromField.store.removeAll()
            me.toField.store.removeAll();

            me.populateFromStore(store);
            
        }
    },
})


