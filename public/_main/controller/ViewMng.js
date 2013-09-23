Ext.define('PumaMain.controller.ViewMng', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMain.view.CommonMngGrid','PumaMain.view.CommonSaveForm'],
    init: function() {
        this.control(
                {
                    'commonmnggrid' : {
                        recmoved: this.onRecMoved,
                        recdeleted: this.onDelete,
                        urlopen: this.onUrlOpen
                    },
                    'commonsaveform #save' : {
                        click: this.onSave
                    },
                    '#savevisualization': {
                        click: this.onVisSave
                    },
                    '#managevisualization': {
                        click: this.onVisOrViewManage
                    },
                    '#savedataview': {
                        click: this.onViewSave
                    },
                    '#managedataview': {
                        click: this.onVisOrViewManage
                    },
                    '#sharedataview': {
                        click: this.onShare
                    },
                })
    },
    
    onUrlOpen: function(grid,rec) {
        var url = window.location.origin+window.location.pathname+'?id='+rec.get('_id');
        var win = Ext.widget('window',{
                bodyCls: 'urlwindow',
                items: [{
                        xtype: 'displayfield',
                        value: url
                }]
            })
            win.show();
    },
    
    onRecMoved: function(grid,rec, moveUp) {
        var store = Ext.StoreMgr.lookup('visualization4sel');
        var ids = store.collect('_id');
        var id = rec.get('_id')
        var idx = Ext.Array.indexOf(ids,id);
        var length = ids.length;
        Ext.Array.remove(ids,id)
        var newIdx = moveUp ? (idx-1) : (idx+1);
        if (newIdx<0 || newIdx+1>length) return;
        Ext.Array.insert(ids,newIdx,[id]);
        var themeId = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        var theme = Ext.StoreMgr.lookup('theme').getById(themeId);
        theme.set('visOrder',ids);
        theme.save();
        store.sort();
        
    },
    onDelete: function(grid,rec) {
        rec.destroy();
    },
    onSave: function(btn) {
        var form = btn.up('form');
        var name = form.getComponent('name').getValue();
        var rec = form.rec;
        rec.set('name',name);
        rec.save({
            callback: this.onSaveFinish
        });
        btn.up('window').close();
        
    },
    onShare: function() {
        var view = Ext.create('Puma.model.DataView',this.gatherViewConfig());
        view.save({
            callback: this.onSaveFinish
        });  
    },
    onSaveFinish: function(rec,operation) {
        var isView = rec.modelName == 'Puma.model.DataView';
        var store = Ext.StoreMgr.lookup(isView ? 'dataview' : 'visualization');
        store.addWithSlaves(rec);
        if (isView) {
            var url = window.location.origin+window.location.pathname+'?id='+rec.get('_id')
            var win = Ext.widget('window',{
                bodyCls: 'urlwindow',
                items: [{
                        xtype: 'displayfield',
                        value: url
                }]
            })
            win.show();
        }
    },
        
    onVisOrViewManage: function(btn) {
        var window = Ext.widget('window',{
            layout: 'fit',
            width: 300,
            height: 400,
            bodyCls: 'manageDwWindow',
            items: [{
                xtype: 'commonmnggrid',
                allowReorder: btn.itemId == 'managevisualization',
                store: Ext.StoreMgr.lookup(btn.itemId == 'managevisualization' ? 'visualization4sel':'dataview')
            }]
        })
        window.show();
    },
        
    onDataviewLoad: function() {
        var yearCombo = Ext.ComponentQuery.query('#selyear')[0];
        var datasetCombo = Ext.ComponentQuery.query('#seldataset')[0];
        var themeCombo = Ext.ComponentQuery.query('#seltheme')[0];
        var visualizationCombo = Ext.ComponentQuery.query('#selvisualization')[0];
        var locationCombo = Ext.ComponentQuery.query('#sellocation')[0];
        
        yearCombo.suspendEvents();
        datasetCombo.suspendEvents();
        themeCombo.suspendEvents();
        visualizationCombo.suspendEvents();
        locationCombo.suspendEvents();
        
        datasetCombo.setValue(Config.cfg.dataset);
        
        var locStore = Ext.StoreMgr.lookup('location4init');
        locStore.clearFilter(true);
        locStore.filter([
            function(rec) {
                return rec.get('dataset')==Config.cfg.dataset;
            }
        ]); 
        locationCombo.setValue(Config.cfg.location);
        
        var themeStore = Ext.StoreMgr.lookup('theme4sel');
        themeStore.clearFilter(true);
        themeStore.filter([
            function(rec) {
                return rec.get('dataset')==Config.cfg.dataset;
            }
        ]);
        themeCombo.setValue(Config.cfg.theme);
        
        var visStore = Ext.StoreMgr.lookup('visualization4sel');
        var yearStore = Ext.StoreMgr.lookup('year4sel');
        var themeYears = Ext.StoreMgr.lookup('theme').getById(Config.cfg.theme).get('years');
        
        yearStore.clearFilter(true);
        yearStore.filter([function(rec) {
            return Ext.Array.contains(themeYears,rec.get('_id'))
        }])
        yearCombo.setValue(Config.cfg.years)
        
        visStore.clearFilter(true);
        visStore.filter([function(rec) {
            return rec.get('theme')==Config.cfg.theme
        }]);
        visualizationCombo.setValue(Config.cfg.visualization);
   
        yearCombo.resumeEvents();
        datasetCombo.resumeEvents();
        themeCombo.resumeEvents();
        visualizationCombo.resumeEvents();
        locationCombo.resumeEvents();
        
        var filters = Config.cfg.filters || [];
        var items = this.getController('Filter').getFilterItems(filters);
        if (items.length) {
            var filterPanel =  Ext.ComponentQuery.query('#advancedfilters')[0];
            filterPanel.add(items);
            var filterController = this.getController('Filter');
            filterController.minFl = Config.cfg.minFilterFl;
            filterController.maxFl = Config.cfg.maxFilterFl;
            filterController.applyFilters(true);
        }
        
        var locationTheme = this.getController('LocationTheme');
        locationTheme.datasetChanged = true;
        locationTheme.visChanged = true;
        locationTheme.themeChanged = true;
        locationTheme.yearChanged = true;
        locationTheme.locationChanged = true;
        locationTheme.onYearChange({cntId:'dataview'});
        
    },
     
    gatherViewConfig: function() {
        var cfg = {};
        cfg.multipleMaps = Ext.ComponentQuery.query('maptools #multiplemapsbtn')[0].pressed===true;
        cfg.years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        cfg.dataset = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        cfg.theme = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        cfg.visualization = Ext.ComponentQuery.query('#selvisualization')[0].getValue();
        cfg.location = Ext.ComponentQuery.query('#sellocation')[0].getValue();
        cfg.expanded = this.getController('Area').getExpandedAndFids().expanded;
        cfg.selMap = this.getController('Select').selMap;
        cfg.choroplethCfg = this.getController('AttributeConfig').layerConfig
        
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        var filters = [];
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var val = slider.getValue();
            val[0] = val[0]/slider.multiplier;
            val[1] = val[1]/slider.multiplier;
            filters.push({
                attrObj: slider.attrObj,
                multiplier: slider.multiplier,
                min: slider.minValue/slider.multiplier,
                units: slider.units,
                max: slider.maxValue/slider.multiplier,
                inc: slider.increment,
                value: val
            })
        }
        cfg.filters = filters;
        cfg.minFilterFl = this.getController('Filter').minFl
        cfg.maxFilterFl = this.getController('Filter').maxFl
        
        var layers = Ext.StoreMgr.lookup('selectedlayers').getRange();
        this.getController('Layers').resetIndexes();
        var layerCfg = [];
        for (var i=0;i<layers.length;i++) {
            var layer = layers[i];
            layerCfg.push({
                opacity: layer.get('layer1').opacity || 1,
                sortIndex: layer.get('sortIndex'),
                type: layer.get('type'),
                attributeSet: layer.get('attributeSet'),
                attribute: layer.get('attribute'),
                at: layer.get('at'),
                symbologyId: layer.get('symbologyId')
            })
        }
        cfg.layers = layerCfg
        
        var store =  Ext.StoreMgr.lookup('paging');
        cfg.page = store.currentPage;
        
        var map = Ext.ComponentQuery.query('#map')[0].map;
        cfg.mapCfg = {
            center: map.center,
            zoom: map.zoom
        }
        
        var cfgs = this.getController('Chart').gatherCfg();
        var queryCfgs = this.getController('Chart').gatherCfg(true);
        var viewCfgs = [];
        for (var i=0;i<cfgs.length;i++) {
            viewCfgs.push({
                cfg: cfgs[i],
                queryCfg: queryCfgs[i]
            })
        }
        cfg.cfgs = viewCfgs;
        
        return {
            conf: cfg
        }
        
    },
    
    
    onVisSave: function() {
        var chartCtrl  = this.getController('Chart')
        var attrSet = chartCtrl.attrSetId;
        if (!attrSet) return;
        var visualization = chartCtrl.visualization || Ext.create('Puma.model.Visualization',{
            attrSet: attrSet
        })
        var cfgs = this.getController('Chart').gatherCfg();
        var layers = Ext.StoreMgr.lookup('selectedlayers').getRange();
        var visibleLayers = [];
        
        for (var i=0;i<cfgs.length;i++) {
            var cfg = cfgs[i];
            if (cfg.type=='scatterchart') {
                visualization.set('scatterAttrs',Ext.Array.pluck(cfg.attrs,'attr'))
            }
            if (cfg.type=='columnchart') {
                visualization.set('columnAttrs',Ext.Array.pluck(cfg.attrs,'attr'))
            }
        }
        
        for (var i=0;i<layers.length;i++) {
            var layer = layers[i];
            var type = layer.get('type')
            
            if (type=='topiclayer') {
                visibleLayers.push({
                    at: layer.get('at'),
                    symbologyId: layer.get('symbologyId')
                })
            }
            if (type=='chartlayer') {
                visualization.set('choroAttr',layer.get('attribute'))
            }
        }
        
        visualization.set('layers',visibleLayers);
        Ext.StoreMgr.lookup('visualization').addWithSlaves(visualization)
        visualization.save();
        
        var win = Ext.widget('window',{
                bodyCls: 'urlwindow',
                items: [{
                        xtype: 'displayfield',
                        value: 'Visualization saved'
                }]
            })
            win.show();
    },
    onViewSave: function() {
        var view = Ext.create('Puma.model.DataView',this.gatherViewConfig());
        var window = Ext.widget('window',{
            layout: 'fit',
            width: 300,
            height: 400,
            bodyCls: 'saveaswindow',
            items: [{
                xtype: 'commonsaveform',
                rec: view
            }]
        })
        window.show();
    }
    
})