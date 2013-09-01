Ext.define('Gisatlib.paging.PhantomStore',{
    extend: 'Ext.data.Store',
    requires: ['Ext.ux.data.PagingMemoryProxy'],
    constructor: function(config) {
        Ext.define('PhantomModel',{
            extend: 'Ext.data.Model',
            fields: ['id'],
            proxy: 'pagingmemory'
        })
        this.data = [];
        this.pageSize = 15;
        this.model = 'PhantomModel'
        this.callParent([config]);
    },
    
    setCount: function(count) {
        var data = [];
        for (var i=0;i<count;i++) {
            data.push({
                id: i
            })
        }
        if (count<=(this.currentPage-1)*this.pageSize) {
            this.currentPage = Math.ceil(count/this.pageSize);
        }
        if (count && this.currentPage < 1) {
            this.currentPage = 1;
        }
        this.proxy.data = data;
        this.load();
    }
   
});


