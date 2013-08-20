Ext.define('PumaMain.controller.Settings', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        
    },
    onDatasetLoad: function() {
        var recs = Ext.StoreMgr.lookup('activedataset').getRange();
        var confs = [];
        for (var i=0;i<recs.length;i++) {
            confs.push({text:recs[i].get('name'),objId:recs[i].get('_id'),allowDepress:false})
        }
        var container = Ext.ComponentQuery.query('initialbar #datasetcontainer')[0]
        container.add(confs);
        var search = window.location.search.split('?')[1];
        var id = search ? search.split('=')[1] : null;
        if (id) {
            Ext.Ajax.request({
            url: Config.url + '/api/urlview/getView',
            params: {_id: id},
            scope: this,
            method: 'GET',
            success: function(response) {
                var cfg = JSON.parse(response.responseText).data;
                Config.cfg = cfg;
                var datasetBtn = Ext.ComponentQuery.query('initialbar #datasetcontainer button[objId='+cfg.dataset+']')[0];
                datasetBtn.toggle();
                this.getController('LocationTheme').onDatasetChange();
            }
        })
        }
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


