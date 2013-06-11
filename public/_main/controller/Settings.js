Ext.define('PumaMain.controller.Settings', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        
    },
    onScopeLoad: function() {
        var recs = Ext.StoreMgr.lookup('activescope').getRange();
        var confs = [];
        for (var i=0;i<recs.length;i++) {
            confs.push({text:recs[i].get('name'),objId:recs[i].get('_id'),allowDepress:false})
        }
        var container = Ext.ComponentQuery.query('initialbar #focuscontainer')[0]
        container.add(confs)
    },
    onThemeLoad: function() {
//        var recs = Ext.StoreMgr.lookup('theme').getRange();
//        var confs = [];
//        for (var i=0;i<recs.length;i++) {
//            confs.push({text:recs[i].get('name'),objId:recs[i].get('_id')})
//        }
//        var container = Ext.ComponentQuery.query('initialbar #themecontainer')[0];
//        container.add(confs)
    }
        
});


