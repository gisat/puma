Ext.define('Gisatlib.data.AggregatedStore',{
    extend: 'Ext.data.Store',
    
    load: function() {
        var me = this;
        for (var i=0;i<this.stores.length;i++) {
            var store = this.stores[i];
            var recs = store.getRange();
            
            if (!recs || !recs.length) {
                store.on('load',function(st) {
                    var records = st.getRange();
                    this.loadRecords(records,{addRecords:true});
                    this.filter();
                },this)
            }
            else {
                this.loadRecords(recs,true);
                this.filter();
            }
            store.on('add',function(st,records) {
                for (var j=0;j<records.length;j++) {
                    this.addSorted(records[j]);
                }
            },this)
        }
    }
    
});


