Ext.define('PumaMng.controller.Theme',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
  
    init: function() {
        this.control({
            'themecontainer #themegrid' : {
                //selectionchange: this.onSelectionChange
            },
            'themecontainer #layers': {
                //change: this.onLayersChange
            },
            'themecontainer #symbologies': {
                //change: this.onSymbologiesChange
            },
            'themecontainer #layergrid': {
                //selectionchange: this.onLayerSelectionChange
            },
            'themecontainer #themeform': {
                beforesave: this.onBeforeSave
            }
            
        })
    },
        
    
        
    onAreaTemplateChange: function(combo, val) {
        var store = Ext.StoreMgr.lookup('symbology4theme');
        store.clearFilter(true);
        store.filter([{filterFn: function(rec) {
                    var areaTemplates = rec.get('areaTemplates');
                    return Ext.Array.contains(areaTemplates,val);
                }}])
    },
    
    onSelectionChange: function(model, selection) {
        var container = model.view.up('themecontainer');
        var layerForm = Ext.ComponentQuery.query('#layerform', container)[0];
        var layerGrid = Ext.ComponentQuery.query('#layergrid', container)[0];
        layerForm.setDisabled(!selection.length);
        layerGrid.setDisabled(!selection.length);
        if (!selection.length) {
            layerForm.getForm().reset();
        }
    },
        
    onLayersChange: function(component,selected) {
        var layerGrid = Ext.ComponentQuery.query('themecontainer #layergrid')[0];
        var layerMapStore = layerGrid.store;
        var layerStore = Ext.StoreMgr.lookup('layer4theme');
        var currentIds = layerMapStore.collect('layerId');
        var layersToRemove = Ext.Array.difference(currentIds,selected);
        var layersToAdd = Ext.Array.difference(selected,currentIds);
        var recsToAddTransformed = [];
        var recsToRemove = layerMapStore.queryBy(function(rec) {
            return Ext.Array.contains(layersToRemove,rec.get('layerId'));
        }).getRange();
        var recsToAdd = layerStore.queryBy(function(rec) {
            return Ext.Array.contains(layersToAdd,rec.get('_id'));
        }).getRange();
        for (var i=0;i<recsToAdd.length;i++) {
            var model = Ext.create('Puma.model.LayerMap',{
                name: recsToAdd[i].get('name'),
                layerId: recsToAdd[i].get('_id'),
                symbologies: []
            })
            recsToAddTransformed.push(model);
        }
        
        layerMapStore.remove(recsToRemove);
        layerMapStore.add(recsToAddTransformed);
        
    },
        
    onLayerSelectionChange: function(model,selection) {
        var layerForm = Ext.ComponentQuery.query('themecontainer #layerform')[0];
        var saveBtn = Ext.ComponentQuery.query('themecontainer #layerform #savebtn')[0];
        var symbologyStore = Ext.StoreMgr.lookup('symbology4theme');
        symbologyStore.clearFilter(true);
        layerForm.getComponent('defaultSymbology').reset();
        
        saveBtn.setDisabled(!selection.length)
        if (!selection.length) {
            symbologyStore.filter([function() {return false}]);
            layerForm.getForm().reset();
            return;
        }
        var layerId = selection[0].get('layerId');
        var symbologies = this.getController('Symbology').getMatchingSymbologies(layerId);
        symbologyStore.filter([function(rec) {
            return Ext.Array.contains(symbologies,rec.get('_id'));
        }])   
        layerForm.getComponent('symbologies').onBindStore(symbologyStore);        
        
        layerForm.getForm().loadRecord(selection[0]);
    },
        
    onSymbologiesChange: function(component,selected) {
        var defSymbologyStore = Ext.StoreMgr.lookup('defsymbology4theme');
        var defSymbologyCombo = Ext.ComponentQuery.query('themecontainer #defaultSymbology')[0];
        defSymbologyCombo.reset();
        defSymbologyStore.clearFilter(true);
        defSymbologyStore.filter([function(rec) {
            return Ext.Array.contains(selected,rec.get('_id'));
        }])
    },
        
    onSave: function() {
        var layerForm = Ext.ComponentQuery.query('themecontainer #layerform')[0];
        var themeForm = Ext.ComponentQuery.query('themecontainer #themeform')[0];
        
        var rec = layerForm.getForm().getRecord();
        if (!rec) return;
        layerForm.getForm().updateRecord(rec);
        rec.save();
        
        debugger;
        var baseThemeForm = themeForm.getForm();
        var theme = baseThemeForm.getRecord();
        if (!theme) return;
        baseThemeForm.updateRecord(theme);
        theme.save();
        
    }
})


