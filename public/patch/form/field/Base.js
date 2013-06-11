Ext.define('Puma.patch.form.field.Base', {
    override: 'Ext.form.field.Base',
    initComponent: function() {
        this.callParent();
        this.on('enable',function() {
            this.validate();
        });
        this.toBeEnabled = !this.disabled;
    }
//    ,
//        
//    enable: function(silent) {
//        
//        this.toBeEnabled = true;
//        if (this.internalDisabled) {           
//            return this;
//        }
//        return this.callParent(silent);
//    },
//        
//    disable: function(silent) {
//        var ret = this.callParent(silent);
//        
//        if (this.internalDisabled) {
//            return this;
//        }
//        this.toBeEnabled = false;
//        return ret;
//    }
        
    
})


