Ext.define('PumaMng.controller.AttributeSet',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
  
    init: function() {
        this.control({
            'attributesetcontainer #attrsetgrid' : {
                selectionchange: this.onSelectionChange
            },
            'attributesetcontainer #attrgrid4attrset #add': {
                click: this.onAttrAdd
            },
            'attributesetcontainer #selectedattrgrid4attrset #remove': {
                click: this.onAttrRemove
            },
            'attributesetcontainer #attrsetform': {
                beforesave: this.onBeforeSave
            }
            
        })
    },
    
    onSelectionChange: function(model, selection) {
        var container = model.view.up('attributesetcontainer');
        var selectedStore = Ext.ComponentQuery.query('#selectedattrgrid4attrset', container)[0].store;
        if (!selection.length) {
            selectedStore.loadData([]);
            return;
        }
        var attrIds = selection[0].get('attributes');
        var attrStore = Ext.StoreMgr.lookup('attribute');
        var attrs = attrStore.queryBy(function(rec) {
            if (Ext.Array.contains(attrIds,rec.get('_id'))) {
                return true;
            }
            return false;
        })
        var attrsToAdd = [];
        attrs.each(function(attr) {
            var cloned = attr.copy();
            attrsToAdd.push(cloned.data);
        })
        selectedStore.loadData(attrsToAdd)       
    },
        
    onAttrAdd: function(btn) {
        var container = btn.up('attributesetcontainer');
        var grid = Ext.ComponentQuery.query('#attrgrid4attrset', container)[0];
        var selected = grid.getSelectionModel().getSelection();
        if (!selected.length) return;
        var store = Ext.StoreMgr.lookup('selectedattribute4attributeset');
        var recsToAdd = [];
        for (var i=0;i<selected.length;i++) {
            var rec = selected[i];
            recsToAdd.push(rec.copy());
        }
        
        store.add(recsToAdd);
    },
        
    onAttrRemove: function(btn) {
        var container = btn.up('attributesetcontainer');
        var grid = Ext.ComponentQuery.query('#selectedattrgrid4attrset', container)[0];
        var selected = grid.getSelectionModel().getSelection();
        if (!selected.length) return;
        var store = Ext.StoreMgr.lookup('selectedattribute4attributeset');
        store.remove(selected);
    },
        
    onBeforeSave: function(formCmp,rec) {
        var store = Ext.StoreMgr.lookup('selectedattribute4attributeset');
        var recs = store.getRange();
        var ids = [];
        for (var i=0;i<recs.length;i++) {
            ids.push(recs[i].get('_id'))
        }
        rec.set('attributes',ids);
        
    }
})

