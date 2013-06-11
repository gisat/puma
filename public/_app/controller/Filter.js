Ext.define('PumaMng.controller.Filter', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            'boundlist': {
                beforeitemclick: this.onCheckItemClick,
                beforecontainerclick: this.onCheckContainerClick
            }
        })
    },
    onCheckItemClick: function(boundList,b,c,d,evt) {
        return this.onCheckContainerClick(boundList,evt);
    },
    onCheckContainerClick: function(boundList,evt) {
        if (!evt.altKey || !evt.shiftKey) {
            return;
        }
        console.log('show filter');
        return false;
    }
});

