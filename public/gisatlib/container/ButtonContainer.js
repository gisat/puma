Ext.define('Gisatlib.container.ButtonContainer', {
    extend: 'Ext.container.Container',
    alias: 'widget.buttonview',
    mixins: ['Ext.util.Bindable'],
    initComponent: function() {
        if (this.store) {
            this.bindStore(this.store);
        }
        this.callParent();
    },
    
    getStoreListeners: function() {
        return {
            datachanged: this.refresh
        }
    },
    refresh: function() {
        if (!this.store) {
            return;
        }
        var recs = this.store.getRange();
        var presentRecs = [];
        var buttonsToDelete = [];
        var buttonsToAdd = [];
        var changed = false;
        this.items.each(function(btn) {
            if (!Ext.Array.contains(recs,btn.rec)) {
                buttonsToDelete.push(btn);
                if (btn.pressed) {
                    changed = true;
                }
            }
            else {
                presentRecs.push(btn.rec);
            }
        
        })
        this.store.each(function(rec) {
            if (!Ext.Array.contains(presentRecs)) {
                
            }
        })
        
        
    }
})


