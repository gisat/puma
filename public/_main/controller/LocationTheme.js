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
            '#initiallocation':{
                change: this.onLocationChange
            },
            '#initialtheme':{
                change: this.onThemeChange
            },
            '#seldataset':{
                change: this.onDatasetChange
            },
            '#sellocation':{
                change: this.onLocationChange
            },
            '#seltheme': {
                change: this.onThemeChange
            },
            '#selyear': {
                change: this.onYearChange
            },
            '#selvisualization': {
                change: this.onVisChange
            },
            '#initialconfirm': {
                click: this.onConfirm
            }
        })
    },
    onDatasetChange: function(cnt,val) {
        if (cnt.eventsSuspended) {
            return;
        }
        this.datasetChanged = true;
        var locationCombo = Ext.ComponentQuery.query(cnt.initial ? '#initiallocation':'#sellocation')[0];
        var locationComboAlt = Ext.ComponentQuery.query(!cnt.initial ? '#initiallocation':'#sellocation')[0] || locationCombo;
        var themeCombo = Ext.ComponentQuery.query(cnt.initial ? '#initialtheme':'#seltheme')[0];
        var themeComboAlt = Ext.ComponentQuery.query(!cnt.initial ? '#initialtheme':'#seltheme')[0] || themeCombo;
        
        
        
        locationCombo.suspendEvents();
        locationComboAlt.suspendEvents();
        themeComboAlt.suspendEvents();
        themeCombo.resumeEvents();
        
        var locStore = Ext.StoreMgr.lookup('location4init');
        locStore.clearFilter(true);
        var locCount = locStore.query('dataset',val).getCount();
        locStore.filter([
            function(rec) {
                return rec.get('dataset')==val || (!rec.get('dataset') && locCount>1);
            }
        ]); 
        locationCombo.show();
        var first = locStore.getAt(0);
        if (first && !cnt.initial) {
            locationCombo.setValue(first);
            
        }
        var themeStore = Ext.StoreMgr.lookup('theme4sel');
        themeStore.clearFilter(true);
        themeStore.filter([
            
            function(rec) {
                return rec.get('dataset')==val;
            }
        ]);
        themeCombo.eventsSuspended = 0;
        var first = themeStore.getAt(0);
        if (first && !cnt.initial) {
            themeCombo.setValue(first)
        }
        if (cnt.initial) {
            locationCombo.setValue(null);
            if (themeCombo && themeCombo.isVisible()) {
                themeCombo.setValue(null);
            }
        }
        locationCombo.resumeEvents();
        locationComboAlt.resumeEvents();
        themeComboAlt.resumeEvents();
    },
    
    onLocationChange: function(cnt,val) {
        if (cnt.eventsSuspended || cnt.initial) {
            return;
        }
        var locObj = this.getController('Area').getLocationObj();
        if (this.datasetChanged) {
            
            this.locationChanged = true;
            this.onYearChange(cnt);
            return;
        }
        
        var areaRoot = Ext.StoreMgr.lookup('area').getRootNode();
        
        var nodesToCollapse = [];
        var nodeToExpand = null;
        for (var i=0;i<areaRoot.childNodes.length;i++) {
            var node = areaRoot.childNodes[i];
            if (node.get('loc') == locObj.location && node.get('gid') == locObj.locGid) {
                nodeToExpand = node;
            }
            else {
                nodesToCollapse.push(node);
            }
        }
        for (var i=0;i<nodesToCollapse.length;i++) {
            var node = nodesToCollapse[i];
            if (nodeToExpand || i!=nodesToCollapse.length-1) {
                node.suppress = true;
            }
            node.collapse();
            node.suppress = false;
        }
        
        if (nodeToExpand) {
            var loaded = nodeToExpand.get('loaded')
            if (!loaded) {
                this.locationChanged = true;
            }
            nodeToExpand.expand();
            
            if (loaded) {
                
                this.getController('Area').zoomToLocation();
            }
        }
        else {
            
            this.getController('Area').zoomToLocation();
        }
   
    },
    
    onConfirm: function() {
        var val = Ext.ComponentQuery.query('#initialtheme')[0].getValue();
        this.onThemeChange({switching:true},val)
    },
    
    onThemeChange: function(cnt,val) {
        if (cnt.eventsSuspended || cnt.initial || !val) {
            return;
        }
        
        this.themeChanged = true;
        
        var themeCombo = null;
        if (cnt.switching) {
            this.getController('DomManipulation').activateLoadingMask();
            this.getController('DomManipulation').renderApp();
            this.getController('Render').renderApp();
            themeCombo = Ext.ComponentQuery.query('#seltheme')[0];
            var datasetVal = Ext.ComponentQuery.query('#initialdataset')[0].getValue();
            var datasetCombo = Ext.ComponentQuery.query('#seldataset')[0];
            var locationVal = Ext.ComponentQuery.query('#initiallocation')[0].getValue();
            var locationCombo = Ext.ComponentQuery.query('#sellocation')[0];
            datasetCombo.suspendEvents();
            locationCombo.suspendEvents();
            themeCombo.suspendEvents();
            
            datasetCombo.setValue(datasetVal);
            locationCombo.setValue(locationVal);
            themeCombo.setValue(val);
            
            datasetCombo.resumeEvents();
            locationCombo.resumeEvents();
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
            this.getController('DomManipulation').deactivateLoadingMask();
            return;
        }
        if (cnt.itemId=='selyear' ) {
            this.yearChanged = true;
        }
        var isFilter = cnt.itemId == 'filter' || cnt.itemId == 'selectfilter';
        var detailLevelChanged = cnt.itemId == 'detaillevel';
        
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
        var instantFilter = Ext.ComponentQuery.query('#instantfilter')[0].pressed
        if (areaController.areaFilter && (cnt.itemId!='dataview' || instantFilter)) {
            params['filter'] = JSON.stringify(areaController.areaFilter);
        }
        
        
        var locationObj = areaController.getLocationObj();
        var cntId = cnt.itemId;
        
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        params['refreshLayers'] = (this.themeChanged) ? true : null;
        params['refreshAreas'] = (this.yearChanged || this.datasetChanged || this.locationChanged || detailLevelChanged || isFilter) ? true : false;
        if (params['refreshLayers']) {
            params['queryTopics'] = this.getQueryTopics(theme);
        }
        var loc = locationObj.location;
        if (this.datasetChanged && loc) {
            var expanded = {};
            var at = locationObj.at;
            var locGid = locationObj.locGid;
            expanded[loc] = {};
            expanded[loc][at] = [locGid]
            params['expanded'] = JSON.stringify(expanded);
        }
        if (detailLevelChanged) {
            var parentGids = this.getController('Area').detailLevelParents;
            params['parentgids'] = JSON.stringify(parentGids);
            params['artifexpand'] = true;
        }
        if (Config.cfg) {
            params['expanded'] = JSON.stringify(Config.cfg.expanded);
        }
        if (cntId=='selyear' && root.hasChildNodes() || isFilter) {
            var expandedAndFids = this.getController('Area').getExpandedAndFids();
            params['expanded'] = JSON.stringify(expandedAndFids.loaded);
            params['fids'] = JSON.stringify(expandedAndFids.fids);
        }
        if (cntId=='slider') {
            params['parentgids'] = JSON.stringify(this.getController('Area').parentGids)
        }
        if (cntId=='selectfilter') {
            delete params['fids'];
        }
        var me = this;
        Ext.Ajax.request({
            url: Config.url+'/api/theme/getThemeYearConf',
            params: params,
            scope: this,
            originatingCnt: cnt,
            visChanged: this.visChanged,
            themeChanged: this.themeChanged,
            datasetChanged: this.datasetChanged,
            locationChanged: this.locationChanged,
            yearChanged: this.yearChanged,
            success: this.onThemeLocationConfReceived,
            failure: function() {
                me.getController('DomManipulation').deactivateLoadingMask();
            }
        })
        
        if (this.visChanged) {
            this.getController('Chart').loadVisualization(vis);
            this.getController('Layers').loadVisualization(vis);
        }
        this.datasetChanged = null;
        this.locationChanged = null;
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
        //this.getController('Layers').reconfigureAll();
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
        areaRoot.removeAll();
        var data = [];
        var currentLevel = [];
        var parentLevel = null;
        var level = null;
        this.addAreasToAreaMap(areasToAdd);
        var leafMap = {};
        for (var i=0;i<areasToAdd.length;i++) {
            var area = areasToAdd[i];
            level = level || area.at;
            //area.children = [];
            if (area.at!=level) {
                level = area.at;
                parentLevel = currentLevel;
                currentLevel = [];
            }
            if (!area.leaf) {
                area.expandable = true;
                area.children = [];
            }
            else {
                leafMap[area.loc] = leafMap[area.loc] || {};
                leafMap[area.loc][area.at] = leafMap[area.loc][area.at] || [];
                leafMap[area.loc][area.at].push(area.gid)
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
        
        
        var tree = Ext.ComponentQuery.query('#areatree')[0];
        tree.suspendEvents();
        tree.view.dontRefreshSize = true;
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
        tree.resumeEvents();
        tree.view.dontRefreshSize = false;
        if (changed) {
            //Ext.StoreMgr.lookup('area').sort();
            tree.view.refresh();
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
        var src = this.getController('Layers').getLegendUrl(layers[0],null,symbologyId);
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
        var nodesToDestroy = []
        for (var i=0;i<thematicNode.childNodes.length;i++) {
            var node = thematicNode.childNodes[i];
            var topic = node.get('topic');
            if (topic && !Ext.Array.contains(topics,parseInt(topic))) {
                mapController.map1.removeLayer(node.get('layer1'))
                mapController.map2.removeLayer(node.get('layer2'))
                nodesToDestroy.push(node);
            }
        }
        for (var i=0;i<nodesToDestroy.length;i++) {
            nodesToDestroy[i].destroy();
        }
   
    },
    
    
    appendLayers: function(layerNodes) {
            layerNodes = layerNodes || [];
            this.topics = this.topics || [];
            var topics  = [];
            var nodesToAdd = [];
            for (var i=0;i<layerNodes.length;i++) {
                var topic = layerNodes[i].topic;
                Ext.Array.include(topics,topic);
                if (Ext.Array.contains(this.topics,topic)) {
                    continue;
                }
                
                nodesToAdd.push(layerNodes[i])
            }
            
            this.topics = topics;
            
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
            
            if (nodesToAdd.length) {
                thematicNode.appendChild(nodesToAdd);
            }
            if (!systemNode.childNodes.length) {
                selectedLayerNode = {
                    type: 'selectedareas',
                    name: 'Selected areas',
                    sortIndex: 0,
                    checked: true,
                    leaf: true
                }
                areaLayerNode = {
                    type: 'areaoutlines',
                    sortIndex: 1,
                    name: 'Area outlines',
                    checked: true,
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
                        var layer1 = new OpenLayers.Layer.WMS('WMS',Config.url+'/api/proxy/wms',Ext.clone(layerDefaults.params),Ext.clone(layerDefaults.layerParams));
                        var layer2 = new OpenLayers.Layer.WMS('WMS',Config.url+'/api/proxy/wms',Ext.clone(layerDefaults.params),Ext.clone(layerDefaults.layerParams));
                        mapController.map1.addLayers([layer1]);
                        mapController.map2.addLayers([layer2]);
                        layerNode.set('layer1',layer1);
                        layerNode.set('layer2',layer2);
                    }
                }
            }
            Ext.StoreMgr.lookup('selectedlayers').loadData(layersToAdd,true);
            var layerController = this.getController('Layers');
            layerController.resetIndexes();
            layerController.onLayerDrop();
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
        
        if (response.request.options.originatingCnt.itemId=='selectfilter') {
            this.getController('Select').selectInternal(conf.areas,false,false,1);
            return;
        }
        
        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        var multiMapBtn = Ext.ComponentQuery.query('maptools #multiplemapsbtn')[0];
        if (years.length<2 && multiMapBtn.pressed) {
            multiMapBtn.toggle(false);
        }
        multiMapBtn.setDisabled(years.length<2);
        
        if (!conf.layerRefMap) {
            conf = {
                add: conf
            }
        }
        if (conf.layerRefMap) {
            this.getController('Area').areaTemplateMap = conf.auRefMap;
        }
        if (conf.areas) {
            this.addAreas(conf.areas);
        }
        if (conf.add || conf.remove) {
            
            var changed = this.refreshAreas(conf.add,conf.remove);
        }
        if (Config.cfg) {
            Ext.StoreMgr.lookup('paging').currentPage = Config.cfg.page;
            var selController = this.getController('Select');
            selController.selMap = Config.cfg.selMap;
            selController.colorMap = selController.prepareColorMap();
            this.getController('Area').colourTree(selController.colorMap);
        }
        if (true) {
            this.removeLayers();
            this.appendLayers(conf.layerNodes);
            Ext.StoreMgr.lookup('layers4outline').load();
        }
        if (conf.layerRefMap) {
            this.updateLayerContext(conf.layerRefMap);
        }
        if (conf.leafMap && conf.add) {
            this.updateLeafs(conf.leafMap)
        }
        if (conf.areas || ((conf.add || conf.remove) && changed)) {
            this.getController('Area').scanTree();
        }
        if (conf.attrSets) {
            this.checkFeatureLayers();
            this.checkAttrSets(conf.attrSets);
        }
        this.getController('Chart').reconfigureAll();
        this.getController('Layers').reconfigureAll();
        if (response.request.options.visChanged) {
            this.getController('Layers').checkVisibilityAndStyles();
        }
        if (Config.cfg && Config.cfg.multipleMaps) {
            multiMapBtn.toggle(true);
        }
        if (response.request.options.locationChanged || response.request.options.datasetChanged) {
            this.getController('Area').zoomToLocation();
        }
        
        this.getController('DomManipulation').deactivateLoadingMask();
        delete Config.cfg;

    },
    checkFeatureLayers: function() {
        var themeId = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        var theme = Ext.StoreMgr.lookup('theme').getById(themeId);
        var topics = theme.get('topics');
        var store = Ext.StoreMgr.lookup('layertemplate2choose');
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(topics,rec.get('topic'));
        }]);
    },
    
    checkAttrSets: function(attrSets) {
        var store = Ext.StoreMgr.lookup('attributes2choose');
        var attrStore = Ext.StoreMgr.lookup('attributeset');
        var existingAttrSets = store.collect('as');
        var asToAdd = Ext.Array.difference(attrSets,existingAttrSets);
        var asToRemove = Ext.Array.difference(existingAttrSets,attrSets);
        var recsToRemove = store.queryBy(function(rec) {
            return Ext.Array.contains(asToRemove,rec.get('as'))
        }).getRange();
        store.remove(recsToRemove);
        var recsToAdd = [];
        for (var i=0;i<asToAdd.length;i++) {
            var as = asToAdd[i];
            var attrs = attrStore.getById(as).get('attributes');
            for (var j=0;j<attrs.length;j++) {
                var attr = attrs[j];
                var rec = Ext.create('Puma.model.MappedChartAttribute',{
                    as: as,
                    attr: attr
                })
                recsToAdd.push(rec)
            }
        }
        store.add(recsToAdd);
        var asStoreToFilter = Ext.StoreMgr.lookup('attributeset2choose');
        asStoreToFilter.clearFilter(true);
        asStoreToFilter.filter([function(rec){
            return Ext.Array.contains(attrSets,rec.get('_id'));
        }])
        
    },
        
    checkUserPolygons: function(years,analysis,callback) {
        Ext.Ajax.request({
            url: Config.url+'/api/userpolygon/checkAnalysis',
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
        if (Config.cfg) {
            selController.selMap = Config.cfg.selMap
            selController.colorMap = selController.prepareColorMap(selController.selMap);
        }
        this.getController('Chart').reconfigureAll();
        if (forceVisReinit===true || itemId == 'visualizationcontainer') {
            this.getController('Layers').checkVisibilityAndStyles(!visChanged,preserveVis);
            
        }
        if (Config.cfg) {
            this.getController('Area').colourTree(selController.colorMap);
            this.getController('Layers').colourMap(selController.colorMap);
            var map = this.getController('Map').map1;
            if (Config.cfg.multipleMaps) {
                Ext.ComponentQuery.query('initialbar #multiplemapsbtn')[0].toggle();
            }
            map.setCenter([Config.cfg.mapCfg.center.lon,Config.cfg.mapCfg.center.lat],Config.cfg.mapCfg.zoom);
            
        }
        delete Config.cfg;
    }

});

