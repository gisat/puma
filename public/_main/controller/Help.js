Ext.define('PumaMain.controller.Help', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    component: {
                        click: this.testClick
                    }
                }
    )},
        
    testClick: function(cmp) {
//        debugger;
//        return false;
//        if (!this.contextHelp) return;
//        var helpCmp = cmp.up('[helpId]');
//        var helpId = 'common'
//        if (helpCmp) {
//            var helpId = helpCmp.helpId;
//        }
        // continue to help page
        
    }
    
});


