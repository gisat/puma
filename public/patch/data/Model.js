Ext.define('Puma.patch.data.Model',{
    override: 'Ext.data.Model',
    
    destroy: function(options) {
        options = Ext.apply({
            records: [this],
            action : 'destroy'
        }, options);

        var me = this,
            isNotPhantom = me.phantom !== true,
            scope  = options.scope || me,
            stores = me.stores,
            store,
            args,
            operation,
            callback;
        operation = new Ext.data.Operation(options);
        callback = function(operation) {
            args = [me, operation];
            if (operation.wasSuccessful()) {
                for(var i = stores.length-1; i >= 0; i--) {
                    store = stores[i];
                    
                    // Remove this record from Store. Avoid Store handling anything by passing the "isMove" flag
                    store.remove(me, true);
                    if (isNotPhantom) {
                        store.fireEvent('write', store, operation);
                    }
                }
                me.clearListeners();
                Ext.callback(options.success, scope, args);
            } else {
                Ext.callback(options.failure, scope, args);
            }
            Ext.callback(options.callback, scope, args);
        };

        // Not a phantom, then we must perform this operation on the remote datasource.
        // Record will be removed from the store in the callback upon a success response
        if (isNotPhantom) {
            me.getProxy().destroy(operation, callback, me);
        }
        // If it's a phantom, then call the callback directly with a dummy successful ResultSet
        else {
            operation.complete = operation.success = true;
            operation.resultSet = me.getProxy().reader.nullResultSet;
            callback(operation);
        }
        return me;
    }
})

