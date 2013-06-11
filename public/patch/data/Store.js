Ext.define('Puma.patch.data.Store',{
    override: 'Ext.data.Store',
    
   
    
    load: function() {
        this.callParent();
        if (!this.loadEventPrepared) {
            this.on('load',this.syncLoad);
            this.loadEventPrepared = true;
        }
    },
    
    syncLoad: function() {
        var stores = this.findMasterSlaves();
        for (var i=0;i<stores.length;i++) {
            var store = stores[i];
            if (store.slave) {
                store.load();
            }
        }
    },
        
    filter: function(filters,value) {
        if (!filters) {
            filters = this.filters.getRange();
            this.clearFilter(true);
        }
        this.callParent(filters,value)
    },
    
    addWithSlaves: function(model) {
        var stores = this.findMasterSlaves();
        for (var i = 0; i < stores.length; i++) {
            var store = stores[i];
            if (this != store) {
                store.addSorted(model);
            }
        }
        this.addSorted(model);
    },
    
    findMasterSlaves: function() {
        var model = this.model.$className;
        var stores = Ext.StoreMgr.getRange();
        var foundStores = [];
        for (var i=0;i<stores.length;i++) {
            var store = stores[i];
            if (store.model.$className == model && !store.independent) {
                foundStores.push(store);
            }
        }
        return foundStores;
    }
})


