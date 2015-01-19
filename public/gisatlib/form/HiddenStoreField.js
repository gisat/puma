Ext.define('Gisatlib.form.HiddenStoreField', {
    extend: 'Ext.form.field.Hidden',
    alias: 'widget.storefield',
    
    initComponent: function() {
        this.callParent();
        if (this.autoSave) {
            this.store.on('write',this.onStoreChanged,this)
            this.store.on('remove',this.onStoreItemRemoved,this)
            this.store.on('add',this.onStoreChanged,this)
        }
        else {
            this.store.on('update',this.validateStore,this)
        }
        
    },
       
    validateStore: function() {
        this.validate();
    },
    
    getErrors: function(value) {

        var errors = this.callParent(arguments);

        if (Ext.isFunction(this.validator)) {
            var msg = this.validator.call(this, value);
            if (msg !== true) {
                errors.push(msg);
            }
        }
        return errors;
    },
        
    onStoreItemRemoved: function(store) {
        this.onStoreChanged(store,true);
    },
        
    onStoreChanged: function(store,remove) {
        var form = this.up('form');
        var record = form.getRecord();
        // pro draggovani chceme obslouzit pouze udalost "add"
        if (record && (remove!==true || !store.dragging)) {
            var base = form.getForm();
            base.updateRecord(record);
            
            if (!base.isValid()) {
                //alert('form not valid');
                return;
            }
            form.fireEvent('beforesave',form,record);
            record.save();
            
        }
        
    },
    
    setValue: function(value) {
        var ret;
        if (this.store.getRootNode) {
            ret = this.setValueTree(value);
        }
        else {
            ret = this.store.loadData(value || []);
        }
        this.validate();
        return ret
        
    },
    getValue: function() {
        if (this.store.getRootNode) {
            return this.getValueTree();
        }
        var records = this.store.getRange();
        var data = [];
        for (var i=0; i<records.length;i++) {
            data.push(Ext.clone(records[i].data));
        }
        return data;
    },
    getRawValue: function() {
        return this.getValue();
    },
    getValueTree: function() {
        var root = this.store.getRootNode();
        var obj = this.parseNode(root);
        return obj;
    },  
    
    parseNode: function(node) {
        var obj = Ext.clone(this.store.proxy.writer.getRecordData(node));
        delete obj['parentId'];
        delete obj['_id'];
        var childNodes = node.childNodes || [];
        var children = [];
        for (var i=0;i<childNodes.length;i++) {
            var childNode = childNodes[i];
            var parsed = this.parseNode(childNode);
            children.push(parsed);
        }
        if (children.length) {
            obj.children = children;
        }
        return obj;
    },        
    
    setValueTree: function(value) {
        
        if (!value) {
            //console.log('removed')
            var nodes = this.store.getRootNode().removeAll(false);
            return;
        }
        var ret = this.store.setRootNode(Ext.clone(value));
        this.store.getRootNode().expand(true);
        return ret;
    },
    
    reset: function() {
        if (this.disableReset) return;
        this.callParent();
    }

})

