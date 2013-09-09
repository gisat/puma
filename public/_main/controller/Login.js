Ext.define('PumaMain.controller.Login',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
  
    init: function() {
        var me = this;
        this.getApplication().on('login',function() {
            me.onLogin();
        })
    },
        
    onLogin: function() {
        var isAdmin = false;
        var isUser = false;
        if (Config.auth) {
            isUser = true;
        }
        if (Config.auth && Ext.Array.contains(Config.auth.groups, 'admingroup')) {
            Config.auth.isAdmin = true;
            isAdmin = true;
        }
        var saveVis = Ext.ComponentQuery.query('#savevisualization')[0];
        if (!saveVis) return;
        var manageVis = Ext.ComponentQuery.query('#managevisualization')[0];
        var saveView = Ext.ComponentQuery.query('#savedataview')[0];
        var manageView = Ext.ComponentQuery.query('#managedataview')[0];
        var shareView = Ext.ComponentQuery.query('#sharedataview')[0];
        saveVis.setVisible(isAdmin);
        manageVis.setVisible(isAdmin);
        saveView.setVisible(isUser);
        manageView.setVisible(isUser);
        shareView.setVisible(isUser);
        Ext.StoreMgr.lookup('dataview').load();
        
    }
})


