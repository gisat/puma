Ext.define('PumaMain.controller.LocationTheme', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
//            'initialbar #themecontainer button': {
//                toggle: this.onThemeChange
//            },
//            'initialbar #yearcontainer button': {
//                click: this.onYearChange
//            },
//            'initialbar #datasetcontainer button': {
//                toggle: this.onDatasetChange
//            },
//            'initialbar #visualizationcontainer button': {
//                toggle: this.onVisualizationChange
//            },
            '#initialdataset':{
                change: this.onDatasetChange
            },
            '#initialtheme':{
                change: this.onThemeChange
            },
            '#seldataset':{
                change: this.onDatasetChange
            },
            '#seltheme': {
                change: this.onThemeChange
            },
            '#selyear': {
                change: this.onYearChange
            },
            '#selvisualization': {
                change: this.onVisChange
            }
        })
    },
    onDatasetChange: function(cnt,val) {
        var themeStore = Ext.StoreMgr.lookup('theme4sel');
        themeStore.clearFilter(true);
        themeStore.filter([
            function(rec) {
                return rec.get('dataset')==val;
            }
        ]);
        if (cnt.xtype!='storecontainer') {
            var combo = Ext.ComponentQuery.query('#seltheme')[0];
            var first = themeStore.getAt(0);
            if (first) {
                combo.setValue(first)
            }
        }
    },

    onThemeChange: function(cnt,val) {
        this.themeChanged = true;
        
        var themeCombo = null;
        if (cnt.xtype=='storecontainer') {
            Ext.getBody().removeCls('intro').addCls('application');
            this.getController('Render').renderApp();
            themeCombo = Ext.ComponentQuery.query('#seltheme')[0];
            var datasetVal = Ext.ComponentQuery.query('#initialdataset')[0].getValue();
            var datasetCombo = Ext.ComponentQuery.query('#seldataset')[0];
            datasetCombo.suspendEvents();
            themeCombo.suspendEvents();
            datasetCombo.setValue(datasetVal);
            themeCombo.setValue(val);
            datasetCombo.resumeEvents();
            themeCombo.resumeEvents();
            
        }
        themeCombo = themeCombo || Ext.ComponentQuery.query('#seltheme')[0];
        var yearCnt = Ext.ComponentQuery.query('#selyear')[0];
        var visCnt = Ext.ComponentQuery.query('#selvisualization')[0];
        yearCnt.suspendEvents();
        visCnt.suspendEvents();
        
        var visStore = Ext.StoreMgr.lookup('visualization4sel');
        var yearStore = Ext.StoreMgr.lookup('year4sel');
        var themeYears = Ext.StoreMgr.lookup('theme').getById(val).get('years');
        
        yearStore.clearFilter(true);
        yearStore.filter([function(rec) {
            return Ext.Array.contains(themeYears,rec.get('_id'))
        }])

        visStore.clearFilter(true);
        visStore.filter([function(rec) {
            return rec.get('theme')==val
        }]);

        var vis = visCnt.getValue();
        if (!vis) {
            this.visChanged = true;
            var first = visStore.getAt(0);
            if (first) {
                visCnt.setValue(first.get('_id'))
                
            }
        }
        
        var years = yearCnt.getValue();
        if (!years.length) {
            this.yearChanged = true;
            yearCnt.setValue([yearStore.getAt(0).get('_id')])
        }
        yearCnt.resumeEvents();
        visCnt.resumeEvents();
        this.onYearChange(themeCombo);
        
        
        
        
    },
    
    onYearChange: function(cnt) {
        var val = Ext.ComponentQuery.query('#selyear')[0].getValue();
        if (!val.length || cnt.eventsSuspended) {
            return;
        }
        if (cnt.itemId=='selyear' ) {
            this.yearChanged = true;
        }
        // zatim nepouzivano
        var isFilter = cnt.itemId == 'filter';
        
        var theme = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        var dataset = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        var vis = Ext.ComponentQuery.query('#selvisualization')[0].getValue();
        var params = {
                theme: theme,
                years: JSON.stringify(years),
                dataset: dataset
            }
        var areaController = this.getController('Area');
        if (areaController.areaFilter) {
            params['filter'] = JSON.stringify(areaController.areaFilter);
        }
        var cntId = cnt.itemId
        
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        params['refreshLayers'] = (this.themeChanged) ? true : null;
        params['refreshAreas'] = true;
        if (params['refreshLayers']) {
            params['queryTopics'] = this.getQueryTopics(theme);
        }
        if (Cnst.cfg) {
            params['expanded'] = JSON.stringify(Cnst.cfg.expanded);
        }
        if (cntId=='selyear' && root.hasChildNodes() || isFilter) {
            var expandedAndFids = this.getController('Area').getExpandedAndFids();
            params['expanded'] = JSON.stringify(expandedAndFids.expanded);
            params['fids'] = JSON.stringify(expandedAndFids.fids);
        }
        if (cntId=='slider') {
            params['parentgids'] = JSON.stringify(this.getController('Area').parentGids)
        }
        Ext.Ajax.request({
            url: Cnst.url+'/api/theme/getThemeYearConf',
            params: params,
            scope: this,
            originatingCnt: cnt,
            visChanged: this.visChanged,
            themeChanged: this.themeChanged,
            yearChanged: this.yearChanged,
            success: this.onThemeLocationConfReceived
        })
        
        if (this.visChanged) {
            this.getController('Chart').loadVisualization(vis);
            this.getController('Layers').loadVisualization(vis);
        }
        this.visChanged = null;
        this.themeChanged = null;
        this.yearChanged = null;
    },
        
    onVisChange: function(cnt) {
        if (cnt.eventsSuspended) {
            return;
        }
        var val = Ext.ComponentQuery.query('#selvisualization')[0].getValue();
        this.getController('Chart').loadVisualization(val);
        this.getController('Layers').loadVisualization(val);
        this.getController('Chart').reconfigureAll();
        this.getController('Layers').reconfigureAll();
        this.getController('Layers').checkVisibilityAndStyles();
    },
        
    onFilter: function() {
        var filterCmp = null;
        this.onYearChange(filterCmp)
    },
    
    getQueryTopics: function(theme) {
        var layerRoot = Ext.StoreMgr.lookup('layers').getRootNode();
        var children = layerRoot.childNodes;
        var presentTopics = [];
        for (var i = 0; i < children.length; i++) {
            var node = children[i];
            var topic = node.get('topic');
            if (topic) {
                presentTopics.push(topic);
            }
        }
        var themeTopics = Ext.StoreMgr.lookup('theme').getById(theme).get('topics');
        var queryTopics = Ext.Array.difference(themeTopics, presentTopics);
        if (themeTopics.length != queryTopics.length) {
            return queryTopics;

        }
    },
    
     
        
    addAreas: function(areasToAdd) {
        var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
        var data = [];
        var currentLevel = [];
        var parentLevel = null;
        var level = null;
        this.addAreasToAreaMap(areasToAdd);
        for (var i=0;i<areasToAdd.length;i++) {
            var area = areasToAdd[i];
            level = level || area.at;
            //area.children = [];
            
            area.children = [];
            if (area.at!=level) {
                level = area.at;
                parentLevel = currentLevel;
                currentLevel = [];
            }
            if (!area.leaf) {
                area.expandable = true;
            }
            area.id = area.at+'_'+area.gid;
            var node = Ext.create('Puma.model.Area',area);
            if (!area.parentgid) {
                data.push(node);
            }
            else {
                for (var j=0;j<parentLevel.length;j++) {
                    if (parentLevel[j].get('gid') == area.parentgid) {
                        parentLevel[j].set('expanded',true);
                        parentLevel[j].appendChild(node)
                    }
                }
            }
            currentLevel.push(node);
        }
        areaRoot.removeAll();
        areaRoot.appendChild(data);
    },
        
    addAreasToAreaMap: function(addedAreas) {
//        var areaMap = this.getController('Area').areaMap;
//        for (var i=0;i<addedAreas.length;i++) {
//            var area = addedAreas[i];
//            areaMap[area.loc] = areaMap[area.loc] || {};
//            areaMap[area.loc][area.at] = areaMap[area.loc][area.at] || {};
//            areaMap[area.loc][area.at][area.gid] = area;
//        }
    },
    
    refreshAreas: function(add,remove) {
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        var changed = false;
        var nodesToDestroy = [];
        this.addAreasToAreaMap(add);
        for (var loc in remove) {
            var locRoot = root.findChild('loc',loc);
            for (var at in remove[loc]) {
                locRoot.cascadeBy(function(node) {
                   if (node.get('at')!=at) return;
                   if (Ext.Array.contains(remove[loc][at],node.get('gid'))) {
                       nodesToDestroy.push(node);
                       changed = true;
                   }
                   
                });
            }
        }
        for (var i=0;i<nodesToDestroy.length;i++) {
            var node = nodesToDestroy[i]
            node.set('id',node.get('at')+'_'+node.get('gid'));
            node.parentNode.removeChild(node,false);
        }
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var featureLayers = Ext.StoreMgr.lookup('dataset').getById(datasetId).get('featureLayers');
        for (var i = 0;i<add.length;i++) {
            var area = add[i];
            var loc = area.loc;
            var at = area.at;
            var atIndex = Ext.Array.indexOf(featureLayers,at);
            var prevAtIndex = atIndex>0 ? atIndex-1 : null;
            var prevAt = featureLayers[prevAtIndex];
            var parentgid = area.parentgid;
            var foundNode = null;
            root.cascadeBy(function(node) {
                if (!parentgid && node==root) {
                    foundNode = node;
                    return false;
                }
                if (node==root) return;
                if (node.get('loc')==loc && node.get('at')==prevAt && node.get('gid')==parentgid) {
                    foundNode = node;
                    return false;
                }
            })
            if (foundNode) {
                changed = true;
                area.id = area.at+'_'+area.gid;
                foundNode.appendChild(area);
            }
            
        }
        if (changed) {
            Ext.StoreMgr.lookup('area').sort();
        }
        return changed;
    },
        
        
    updateLayerContext: function(cfg) {
         var mapController = this.getController('Map');
         var years = Ext.ComponentQuery.query('#selyear')[0].getValue()
         var map1Year = mapController.map1.year;
         var map2Year = mapController.map2.year;
         var map1Change = (map1Year!=years[0]) ? true : false;
         var map2Change = (years.length>1 && map2Year!=years[1]) ? true : false;
         mapController.map1.year = years[0];
         mapController.map2.year = years.length>1 ? years[1] : null;
         var me = this;
         if (map1Change || map2Change) {
             var colorMap = this.getController('Select').colorMap
             this.getController('Layers').colourMap(colorMap,!map1Change,!map2Change);
         }
         Ext.StoreMgr.lookup('layers').getRootNode().cascadeBy(function(node) {
            if (node.get('type')!='topiclayer') {
                return;
            }
            var layer1 = node.get('layer1');
            var layer2 = node.get('layer2');
            if (!layer1.initialized || map1Change) {
                me.initializeLayer(node,layer1,years[0],cfg)
            }
            if ((!layer2.initialized || map2Change)&&years.length>1) {
                me.initializeLayer(node,layer2,years[1],cfg)
            }
        })
    },
    initializeLayer: function(node,layer,year,cfg) {
        var at = node.get('at');
        var symbologyId = node.get('symbologyId');
        symbologyId = symbologyId=='#blank#' ? '' : symbologyId;
        var atCfg = cfg[at];
        var layers = [];
        var symbologies = [];
        for (var loc in atCfg) {
            var locCfg = atCfg[loc][year] || [];
            
            for (var i=0;i<locCfg.length;i++) {
                layers.push(locCfg[i].layer);
                symbologies.push(symbologyId || '');
            }
            
        }
        layer.initialized = true;
        layer.mergeNewParams({
            layers: layers.join(','),
            styles: symbologies.join(',')
        })
        var src = this.getController('Layers').getLegendUrl(layers[0]);
        node.set('src',src)
        if (node.get('checked')) {
            layer.setVisibility(true);
        }
    },
        
    
    
    removeLayers: function() {
        var themeId = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        var topics = Ext.StoreMgr.lookup('theme').getById(themeId).get('topics');
        var thematicNode = Ext.StoreMgr.lookup('layers').getRootNode().findChild('type','thematicgroup');
        
        var mapController = this.getController('Map');
        for (var i=0;i<thematicNode.childNodes.length;i++) {
            var node = thematicNode.childNodes[i];
            var topic = node.get('topic');
            if (topic && !Ext.Array.contains(topics,topic)) {
                mapController.map1.removeLayer(node.get('layer1'))
                mapController.map2.removeLayer(node.get('layer2'))
                node.destroy();
            }
        }
   
    },
    
    
    appendLayers: function(layerNodes) {
            var topics = [];
            for (var i=0;i<layerNodes.length;i++) {
                topics.push(layerNodes[i].topic);
            }
            var root = Ext.StoreMgr.lookup('layers').getRootNode();
            var childNodes = root.childNodes;
            var areaLayerNode = null;
            var selectedLayerNode = null;
            var systemNode = null;
            var thematicNode = null;
            for (var i=0;i<childNodes.length;i++) {
                var node = childNodes[i];
                var type = node.get('type');
                
                if (type=='systemgroup') {
                    systemNode = node;
                }
                if (type=='thematicgroup') {
                    thematicNode = node;
                }
            }
            
            
            thematicNode.appendChild(layerNodes);
            
            if (!systemNode.childNodes.length) {
                selectedLayerNode = {
                    type: 'selectedareas',
                    name: 'Selected areas',
                    checked: true,
                    leaf: true
                }
                areaLayerNode = {
                    type: 'areaoutlines',
                    name: 'Area outlines',
                    checked: false,
                    leaf: true
                }
                systemNode.appendChild([selectedLayerNode,areaLayerNode]);
            }
            
            
            
            var layersToAdd = [];
            
            var layerDefaults = this.getController('Layers').getWmsLayerDefaults();
            
        
            var mapController = this.getController('Map');
            for (var i=0;i<root.childNodes.length;i++) {
                var node = root.childNodes[i];
                if (node.get('type')=='thematicgroup' || node.get('type')=='systemgroup') {
                    for (var j=0;j<node.childNodes.length;j++) {
                        var layerNode = node.childNodes[j];
                        if (layerNode.get('layer1')) continue;
                        if (node.get('type')=='thematicgroup' && !Ext.Array.contains(topics,layerNode.get('topic'))) continue;
                        Ext.Array.include(layersToAdd,layerNode); 
                        var layer1 = new OpenLayers.Layer.WMS('WMS',Cnst.url+'/api/proxy/wms',Ext.clone(layerDefaults.params),Ext.clone(layerDefaults.layerParams));
                        var layer2 = new OpenLayers.Layer.WMS('WMS',Cnst.url+'/api/proxy/wms',Ext.clone(layerDefaults.params),Ext.clone(layerDefaults.layerParams));
                        mapController.map1.addLayers([layer1]);
                        mapController.map2.addLayers([layer2]);
                        layerNode.set('layer1',layer1);
                        layerNode.set('layer2',layer2);
                    }
                }
            }
            Ext.StoreMgr.lookup('selectedlayers').loadData(layersToAdd,true);
    },
        
    updateLeafs: function(leafMap) {
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        root.cascadeBy(function(node) {
            var loc = node.get('loc');
            var at = node.get('at');
            var gid = node.get('gid');
            if (leafMap[loc] && leafMap[loc][at] && leafMap[loc][at][gid]) {
                node.set('leaf',true);
                node.set('expanded',false)
            }
            else if (node.get('leaf')) {
                node.set('leaf',false)
            }
        })
        
    },
    
    onThemeLocationConfReceived: function(response) {
        
        var conf = JSON.parse(response.responseText).data;
        if (conf.layerRefMap) {
            this.getController('Area').areaTemplateMap = conf.auRefMap;
        }
        if (conf.areas) {
            this.addAreas(conf.areas);
        }
        if (conf.add || conf.remove) {
            var changed = this.refreshAreas(conf.add,conf.remove);
        }
        if (conf.layerNodes && conf.layerNodes.length) {
            this.removeLayers();
            this.appendLayers(conf.layerNodes);
        }
        if (conf.layerRefMap) {
            this.updateLayerContext(conf.layerRefMap);
        }
        if (conf.leafMap) {
            this.updateLeafs(conf.leafMap)
        }
        if (conf.areas || ((conf.add || conf.remove) && changed)) {
            this.getController('Area').scanTree();
        }
        this.getController('Chart').reconfigureAll();
        this.getController('Layers').reconfigureAll();
        if (response.request.options.visChanged) {
            this.getController('Layers').checkVisibilityAndStyles();
        }
        //this.initVisualizations(btn);
        
//        mc.drawnLayer.destroyFeatures();
//        if (conf.userPolygons) {
//            var format = new OpenLayers.Format.WKT();
//            
//            for (var featureId in conf.userPolygons.geometries) {
//                var obj = conf.userPolygons.geometries[featureId];
//                var feature = format.read(obj.geom);
//                feature.gid = parseInt(featureId);
//                mc.drawnLayer.addFeatures([feature]);
//            }
//        }
//        this.reinitializeTreesAreas(conf.areaTrees,btn)
    },
    
    initVisualizations: function(btn) {
        var theme = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0].objId;
        var visBtns = Ext.ComponentQuery.query('initialbar #visualizationcontainer button');
        
        var visStore = Ext.StoreMgr.lookup('visualization')
        var visualizations = visStore.getRange();
        var activeVisualizationsIds = [];
        
        for (var i=0;i<visualizations.length;i++) {
            var vis = visualizations[i];
            if (vis.get('theme') == theme) {
                activeVisualizationsIds.push(vis.get('_id'))
            }
        }
        var presentIds = [];
        var containsActive = false;
        for (var i=0;i<visBtns.length;i++) {
            var visBtn = visBtns[i];
            var btnId = visBtn.objId;
            if (!Ext.Array.contains(activeVisualizationsIds,btnId) && btnId!='custom') {
                visBtn.ownerCt.remove(visBtn);
                continue;
            }
            if (visBtn.pressed) {
                containsActive = true;
            }
            presentIds.push(btnId);
        }
    
        var visToAdd = Ext.Array.difference(activeVisualizationsIds,presentIds);
        var confs = [];
        
        var visObjsToAdd = [];
        for (var i=0;i<visToAdd.length;i++) {
            var vis = visStore.getById(visToAdd[i]);
            visObjsToAdd.push(vis)
        }
        visObjsToAdd.sort(function(vis1,vis2) {
            var s1 = vis1.get('sortIndex');
            var s2 = vis2.get('sortIndex');
            return s1>s2;
        })
        for (var i=0;i<visObjsToAdd.length;i++) {
            var vis = visObjsToAdd[i]
            confs.push({text:vis.get('name'),objId:vis.get('_id'),allowDepress:false})
        }
        if (!visBtns.length) {
            confs.push({text:'Custom',objId:'custom',allowDepress:false})
        }
        var container = Ext.ComponentQuery.query('initialbar #visualizationcontainer')[0]
        container.insert(1,confs);
        var forceVisReinit = false;
        if (!containsActive) {
            if (Cnst.cfg) {
                var btnToActivate = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[objId='+Cnst.cfg.visualization+']')[0]
            }
            else {
                var btnToActivate = Ext.ComponentQuery.query('initialbar #visualizationcontainer button')[0]
                
            }
            btnToActivate.toggle(true,true);
            forceVisReinit = true;
        }
        this.onVisualizationChange(btn,true,forceVisReinit);
    },
        
        
    checkUserPolygons: function(years,analysis,callback) {
        Ext.Ajax.request({
            url: Cnst.url+'/api/userpolygon/checkAnalysis',
            params: {
                analysis: JSON.stringify(analysis || [955]),
                years: JSON.stringify(years || [277])
            },
            success: callback
        })
    },
        
    onVisualizationChange: function(btn,value,forceVisReinit) {
        if (!value) return;
        var itemId = btn.ownerCt.itemId;
        var visChanged = false;
        if (forceVisReinit===true || itemId == 'visualizationcontainer') {
            var vis = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[pressed=true]')[0].objId;
            if (vis=='custom') return;
            this.getController('Chart').loadVisualization(vis);
            visChanged = true;
        }
        
        var preserveVis = false;
        
        var selController = this.getController('Select')
        if (Cnst.cfg) {
            selController.selMap = Cnst.cfg.selMap
            selController.colorMap = selController.prepareColorMap(selController.selMap);
        }
        this.getController('Chart').reconfigureAll();
        if (forceVisReinit===true || itemId == 'visualizationcontainer') {
            this.getController('Layers').checkVisibilityAndStyles(!visChanged,preserveVis);
            
        }
        if (Cnst.cfg) {
            this.getController('Area').colourTree(selController.colorMap);
            this.getController('Layers').colourMap(selController.colorMap);
            var map = this.getController('Map').map1;
            if (Cnst.cfg.multipleMaps) {
                Ext.ComponentQuery.query('initialbar #multiplemapsbtn')[0].toggle();
            }
            map.setCenter([Cnst.cfg.mapCfg.center.lon,Cnst.cfg.mapCfg.center.lat],Cnst.cfg.mapCfg.zoom);
            
        }
        delete Cnst.cfg;
    }

});

