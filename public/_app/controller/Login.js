Ext.define('PumaMng.controller.Login',{
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
        if(Config.auth && Ext.Array.contains(Config.auth.groups,'admingroup')){
            isAdmin = true;
        }else{
            Ext.ComponentQuery.query('maintabpanel')[0].setActiveTab(0);
        }
        var tabs = Ext.ComponentQuery.query('maintabpanel panel')
        for (var i=0;i<tabs.length;i++) {
            tabs[i].setDisabled(!isAdmin);
        }
        
        Ext.ComponentQuery.query('layerrefform')[0].disable();
    }
})

