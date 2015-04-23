Ext.define('PumaMng.controller.Theme',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
  
    init: function() {
        this.control({
            'managementtab themeform #topics' : {
                change: this.onTopicsChange
            },
            'managementtab themeform #prefTopics' : {
                change: this.onPrefTopicsChange
            },
            'managementtab themeform #dataset' : {
                change: this.onDatasetChange
            }
            
        })
    },
        
    onPrefTopicsChange: function(item,value) {
        if (!value) return;
        var topics = value;
        var attrSetStore = Ext.StoreMgr.lookup('attributeset4theme');
    },
    onTopicsChange: function(item,value) {
        if (!value) return;
        var topics = value;
        var attrSetStore = Ext.StoreMgr.lookup('attributeset4theme');
        attrSetStore.clearFilter(true);
        attrSetStore.filter([function(rec) {
            return Ext.Array.contains(topics,rec.get('topic'))
        }])
    },
    onDatasetChange: function(item,value) {
        if (!value) return;
        var featureLayerStore = Ext.StoreMgr.lookup('featurelayer4theme');
        var dataset = Ext.StoreMgr.lookup('dataset').getById(value);
        var featureLayers = dataset.get('featureLayers');
        featureLayerStore.clearFilter(true);
        featureLayerStore.filter([function(rec) {
            return Ext.Array.contains(featureLayers,rec.get('_id'));
        }])
    }
      
            
    
})


