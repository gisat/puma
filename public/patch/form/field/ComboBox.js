Ext.define('Puma.patch.form.field.ComboBox', {
    override: 'Ext.form.field.ComboBox',
    onDataChanged: function() {
        this.callParent();
        var index = this.store.find(this.valueField, this.value);
        if (index == -1) {
            this.setValue(null);
        }
    }
})
   


