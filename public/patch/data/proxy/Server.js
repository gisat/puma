Ext.define('Puma.patch.data.proxy.Server', {
    override: 'Ext.data.proxy.Server',
    setException: function(operation, response) {
        operation.setException({
            status: response.status,
            statusText: response.statusText,
            response: response
        });
    }

});

