Ext.define('Puma.patch.dd.DropZone', {
    override: 'Ext.dd.DropZone',
        
    notifyDrop : function(dd, e, data){
        if(this.lastOverNode){
            this.onNodeOut(this.lastOverNode, dd, e, data);
            this.lastOverNode = null;
        }
        var n = this.getTargetFromEvent(e);
        dd.view.store.dragging = true;
        var ret = n ?
            this.onNodeDrop(n, dd, e, data) :
            this.onContainerDrop(dd, e, data);
        dd.view.store.dragging = false;
        return ret;
    },
})



