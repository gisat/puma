Ext.define('PumaMain.controller.ViewMng', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMain.view.CommonMngGrid','PumaMain.view.CommonSaveForm'],
    init: function() {
        this.control(
                {
                    'commonmnggrid' : {
                        recmoved: this.onRecMoved,
                        recdeleted: this.onDelete
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
        var view = Ext.create('Puma.model.DataView');
        view.save({
            callback: this.onSaveFinish
        });  
    },
    onSaveFinish: function(rec,operation) {
        var isView = rec.modelName == 'Puma.model.DataView';
        var store = Ext.StoreMgr.lookup(isView ? 'dataview' : 'visualization');
        store.addWithSlaves(rec);
        if (isView) {
            var window = Ext.widget('window',{
                items: [{
                        xtype: 'displayfield',
                        value: 'urlforid_'+rec.get('_id')
                }]
            })
            window.show();
        }
    },
        
    onVisOrViewManage: function(btn) {
        var window = Ext.widget('window',{
            layout: 'fit',
            width: 300,
            height: 400,
            items: [{
                xtype: 'commonmnggrid',
                allowReorder: btn.itemId == 'managevisualization',
                store: Ext.StoreMgr.lookup(btn.itemId == 'managevisualization' ? 'visualization4sel':'dataview')
            }]
        })
        window.show();
    },
        
        
    gatherViewConfig: function() {
        var cfg = {};
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
            filters.push({
                min: slider.minValue,
                max: slider.maxValue,
                inc: slider.increment,
                value: slider.getValue()
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
        var theme = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        var cfgs = this.getController('Chart').gatherCfg();
        var layerCfgs = this.getController('AttributeConfig').layerConfig
        var layers = Ext.StoreMgr.lookup('selectedlayers').getRange();
        var visibleLayers = [];
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
                visibleLayers.push({
                    attributeSet: layer.get('attributeSet'),
                    attribute: layer.get('attribute')
                })
            }
        }
        
        
        
        var vis = Ext.create('Puma.model.Visualization',{
            theme: theme,
            cfg: cfgs,
            choroplethCfg: layerCfgs,
            visibleLayers: visibleLayers
        });
        var window = Ext.widget('window',{
            layout: 'fit',
            width: 300,
            height: 400,
            items: [{
                xtype: 'commonsaveform',
                rec: vis
            }]
        })
        window.show();
    },
    onViewSave: function() {
        var view = Ext.create('Puma.model.DataView',this.gatherViewConfig());
        var window = Ext.widget('window',{
            layout: 'fit',
            width: 300,
            height: 400,
            items: [{
                xtype: 'commonsaveform',
                rec: view
            }]
        })
        window.show();
    }
    
})