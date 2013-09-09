Ext.define('Gisatlib.data.SlaveStore',{
    extend: 'Ext.data.Store',
    slave: true,
    
    load: function() {
        var masterStore = this.findMaster();
        if (!masterStore) {
            this.callParent();
            return;
        }
        if (masterStore.getRange) {
             var records = masterStore.getRange();
        }
        else {
            var records = [];
            masterStore.getRootNode().cascadeBy(function(node) {
                records.push(node);
            })
        }
        //console.log(this.storeId);
        //console.log(records);
        this.loadRecords(records);
        this.filter();
        this.fireEvent('load',this,records,true);
    },
    
    findMaster: function() {
        var model = this.model.$className;
        var stores = Ext.StoreMgr.getRange();
        for (var i=0;i<stores.length;i++) {
            var store = stores[i];
            if (store.model.$className == model && !store.slave) {
                return store;
            }
        }
    }
    
});
	


