
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
            '#initialscope':{
                change: this.onScopeChange
            },
            '#initialtheme':{
                change: this.onThemeChange
            },
            '#seldataset':{
                change: this.onDatasetChange
            },
            '#selscope':{
                change: this.onScopeChange
            },
            '#seltheme': {
                change: this.onThemeChange
            },
            '#selyear': {
                change: this.onYearChange
            },
            '#selindicator': {
                change: this.onIndicatorChange
            },
            '#selvisualization': {
                change: this.onVisChange
            },
            '#initialconfirm': {
                click: this.onConfirm
            },
            'discretetimeline': {
                change: this.testTimeline
            }
        })
        
        Ext.Ajax.request({
                url: Config.url + '/api/theme/getAttrConf',
                scope: this,
                method: 'POST',
                success: function(response) {
                    this.attrConf = JSON.parse(response.responseText).data;
                }
                
            })
        this.wasMulti = false;

    },
    testTimeline: function(slider,value) {
        console.log(value);
    },
    onDatasetChange: function(cnt,val) {
        if (cnt.eventsSuspended) {
            return;
        }
        
        var themeStore = Ext.StoreMgr.lookup('theme4sel');
        var themes = this.attrConf[val] || [];
        
        themeStore.clearFilter();
        themeStore.filter([function(rec) {
            return Ext.Array.contains(themes,rec.get('_id'))
        }])
        
        var themeComboId = cnt.initial ? '#initialtheme' : '#seltheme'
        var themeCombo = Ext.ComponentQuery.query(themeComboId)[0];
        var themeVal = themeCombo.getValue();
        if (!themeVal) {
            themeCombo.suspendEvents();
            var themeFirst = themeStore.getAt(0);
            if (!themeFirst) {
                Ext.ComponentQuery.query('#initialindicator')[0].setValue(null);
                return;
            }
            themeVal = themeFirst.get('_id')
            themeCombo.setValue(themeVal)
            themeCombo.resumeEvents();
            this.themeChanged = true;
        }
        var theme = Ext.StoreMgr.lookup('theme').getById(themeVal);
        var topic = theme.get('topics')[0];
        
        var attrStore = Ext.StoreMgr.lookup('attribute4sel');
        var attrSet = Ext.StoreMgr.lookup('attributeset').queryBy(function(rec) {
            return rec.get('topic')==topic && rec.get('dataset')==val;
        }).first();
        
        this.attrSet = attrSet.get('_id');
        var attributes = attrSet.get('attributes');
        if (!cnt.initial) {
            var attrCombo = Ext.ComponentQuery.query('#selindicator')[0]
            attrCombo.suspendEvents();
        }
        
        attrStore.clearFilter();
        attrStore.filter([function(rec) {
            return Ext.Array.contains(attributes,rec.get('_id'))
        }])
        attrStore.sorters.clear();
//        
        attrStore.sort([function(a,b) {
//            var arr = [407,406,408,409,410];
//            arr.reverse();
                    var idx1 = Ext.Array.indexOf(attributes,a.get('_id'));
                    var idx2 = Ext.Array.indexOf(attributes,b.get('_id'));
                    return idx1>idx2 ? 1 : -1;
        }
        ]
        )
        
        if (cnt.initial) {
            return;
        }
        
        
        var attrVal = attrCombo.getValue();
        if (!attrVal) {
            attrVal = attrStore.getAt(0).get('_id')
            attrCombo.setValue(attrVal)
            
            this.indicatorChanged = true;
        }
        
        attrCombo.resumeEvents();
        
        this.getController('DomManipulation').activateLoadingMask();
        this.datasetChanged = true;
        var changed = this.changeYears(themeVal,val);
        if (changed) return;
        this.onYearChange(cnt)
        
    },
    changeYears: function(themeVal,datasetVal) {
        var theme = Ext.StoreMgr.lookup('theme').getById(themeVal);
        var topics = theme.get('topics');
        var attrSet = Ext.StoreMgr.lookup('attributeset').queryBy(function(rec) {
            return Ext.Array.contains(topics,rec.get('topic')) && rec.get('dataset')==datasetVal && rec.get('attributes') && rec.get('attributes').length;
        }).getAt(0);
        var years = attrSet.get('years');
        var year = attrSet.get('year');
        
        var yearStore = Ext.StoreMgr.lookup('year');
        yearStore.clearFilter();
        var yearCombo = Ext.ComponentQuery.query('#selyear')[0]
        var currentYears = yearCombo.getValue();
        var changed = false;
        
        if (year && currentYears && currentYears.length && !Ext.Array.contains(currentYears,year)) {
            changed = true;
            yearCombo.setValue(year);
        }
        else if (years && years.length && currentYears && currentYears.length && !Ext.Array.intersect(years,currentYears)) {
            changed = true;
        }
        else if (year && (!currentYears || !currentYears.length)) {
            changed = true;
            yearCombo.setValue(year);
        }
        if (years && years.length) {
            yearStore.filter([function(rec) {
                return Ext.Array.contains(years,rec.get('_id'))
            }])
        }
        return changed;
        
        
        
    },
    onScopeChange: function(cnt,val) {
        if (cnt.eventsSuspended) {
            return;
        }
        var scopeObj = Ext.StoreMgr.lookup('scope').getById(val);
        var datasetStore = Ext.StoreMgr.lookup('dataset4sel');
        
        var datasetCombo = Ext.ComponentQuery.query('#seldataset')[0];
        if (datasetCombo) datasetCombo.suspendEvents();
        datasetStore.clearFilter();
        datasetStore.filter([function(rec) {
            return Ext.Array.contains(scopeObj.get('datasets'),rec.get('_id'));
        }])
        if (datasetCombo) datasetCombo.resumeEvents();
        var first = datasetStore.getAt(0);
        if (cnt.initial || !first) return;
        datasetCombo.setValue(parseInt(first.get('_id')));
        
    },
        
    onIndicatorChange: function(cnt,val) {
        if (cnt.eventsSuspended) {
            return;
        }
        this.reconfigureChartComboValues(this.attrSet)
        this.getController('Chart').reconfigureAll();
        var layerStore = Ext.StoreMgr.lookup('layers');
        var nodes = layerStore.getRootNode().findChild('type','choroplethgroup').childNodes;
        
        for (var i=0;i<nodes.length;i++) {
            var node = nodes[i];
            if (node.get('attribute')==val) {
                node.set('checked',true);
                this.getController('Layers').onCheckChange(node,true);
            }
        }
        
        
    },
    onLocationChange: function(cnt,val) {
        if ((val=='custom' || val=='Custom' || !val) && !cnt.initial && this.locationInitialized) {
            this.forceInit = true;
            this.updateLayerContext();
            this.forceInit = false;
        }
        if (!cnt.initial) {
            
            this.locationInitialized = true;
        }
        if (cnt.eventsSuspended || cnt.initial || val=='custom' || val=='Custom' || !val) {
            
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
            var loaded = nodeToExpand.get('loaded') || nodeToExpand.isLeaf();
            if (!loaded) {
                this.locationChanged = true;
            }
            nodeToExpand.expand();
            
            if (loaded) {
                this.getController('Area').scanTree();
                if (nodesToCollapse.length) {
                    var selController = this.getController('Select');
                    this.getController('Area').colourTree(selController.colorMap);
                    this.getController('Layers').colourMap(selController.colorMap);
                }
                this.getController('Chart').reconfigureAll();
                this.getController('Layers').reconfigureAll();
                this.getController('Area').zoomToLocation();
            }
        }
        else {
            this.getController('Area').scanTree();
            if (nodesToCollapse.length) {
                var selController = this.getController('Select');
                this.getController('Area').colourTree(selController.colorMap);
                this.getController('Layers').colourMap(selController.colorMap);
                this.getController('Chart').reconfigureAll();
                this.getController('Layers').reconfigureAll();
            }
            this.getController('Area').zoomToLocation();
        }
        this.forceInit = true;
        this.updateLayerContext();
        this.forceInit = false;
   
    },
    
    onConfirm: function() {
        var val = Ext.ComponentQuery.query('#initialtheme')[0].getValue();
        this.datasetChanged = true;
        this.onThemeChange({switching:true},val)
    },
    
    onThemeChange: function(cnt,val) {
        if (cnt.eventsSuspended || cnt.initial || !val) {
            return;
        }
        
        this.themeChanged = true;
        
        var themeCombo = null;
        if (cnt.switching) {
            Ext.suspendLayouts();
            this.getController('DomManipulation').activateLoadingMask();
            this.getController('DomManipulation').renderApp();
            this.getController('Render').renderApp();
            themeCombo = Ext.ComponentQuery.query('#seltheme')[0];
            var datasetVal = Ext.ComponentQuery.query('#initialdataset')[0].getValue();
            var datasetCombo = Ext.ComponentQuery.query('#seldataset')[0];
            var scopeVal = Ext.ComponentQuery.query('#initialscope')[0].getValue();
            var scopeCombo = Ext.ComponentQuery.query('#selscope')[0];
            var indicatorVal = Ext.ComponentQuery.query('#initialindicator')[0].getValue();
            var indicatorCombo = Ext.ComponentQuery.query('#selindicator')[0];
            var yearCombo = Ext.ComponentQuery.query('#selyear')[0];
            datasetCombo.suspendEvents();
            scopeCombo.suspendEvents();
            themeCombo.suspendEvents();
            yearCombo.suspendEvents();
            indicatorCombo.suspendEvents();
            datasetCombo.setValue(datasetVal);
            scopeCombo.setValue(scopeVal);
            themeCombo.setValue(val);
            indicatorCombo.setValue(indicatorVal);
            yearCombo.refresh();
            
            datasetCombo.resumeEvents();
            scopeCombo.resumeEvents();
            themeCombo.resumeEvents();
            indicatorCombo.resumeEvents();
            yearCombo.resumeEvents();
            
            var chartController = this.getController('Chart');
            chartController.addChart({type:'grid',title:'Grid'},true);
            chartController.addChart({type:'columnchart',title:'Column',aggregate:'avg'},true);
            chartController.addChart({type:'scatterchart',title:'Scatter'},true);
            //chartController.addChart({type:'boxplotchart',title:'Box plot'},true);
            //Ext.resumeLayouts();
        }
        themeCombo = themeCombo || Ext.ComponentQuery.query('#seltheme')[0];
        yearCombo = yearCombo || Ext.ComponentQuery.query('#selyear')[0];
        
        var changed = this.changeYears(val,datasetVal || Ext.ComponentQuery.query('#seldataset')[0].getValue());
        if (changed) return;
        var yearVal = yearCombo.getValue();
        if (!yearVal || !yearVal.length) {
            yearCombo.setValue([Ext.StoreMgr.lookup('year').getAt(0)]);
        }
        else {
            this.onYearChange(themeCombo);
        }
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
        //var vis = Ext.ComponentQuery.query('#selvisualization')[0].getValue();
        var params = {
                theme: theme,
                years: JSON.stringify(years),
                dataset: dataset
            }
        var areaController = this.getController('Area');
     
        //var locationObj = areaController.getLocationObj();
        var cntId = cnt.itemId
        
        var root = Ext.StoreMgr.lookup('area').getRootNode();
        params['refreshLayers'] = (this.themeChanged || this.datasetChanged) ? true : null;
        params['refreshAreas'] = (this.datasetChanged || detailLevelChanged || isFilter) ? true : false;
        if (params['refreshLayers']) {
            params['queryTopics'] = this.getQueryTopics(theme);
        }

        if (detailLevelChanged) {
            var parentGids = this.getController('Area').detailLevelParents;
            params['parentgids'] = JSON.stringify(parentGids);
            params['artifexpand'] = true;
        }
        if (Config.cfg) {
            params['expanded'] = JSON.stringify(Config.cfg.expanded);
        }
//        if (cntId=='selyear' && root.hasChildNodes() || isFilter) {
//            var expandedAndFids = this.getController('Area').getExpandedAndFids();
//            params['expanded'] = JSON.stringify(expandedAndFids.loaded);
//            params['fids'] = JSON.stringify(expandedAndFids.fids);
//        }
//        if (cntId=='slider') {
//            params['parentgids'] = JSON.stringify(this.getController('Area').parentGids)
//        }
//        if (cntId=='selectfilter') {
//            delete params['fids'];
//        }
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
        
//        if (this.visChanged) {
//            this.getController('Chart').loadVisualization(vis);
//            this.getController('Layers').loadVisualization(vis);
//        }
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
    
    refreshVisualization: function() {
        this.onVisChange({});
    },
    refreshTheme: function() {
        var val = Ext.ComponentQuery.query('#seltheme')[0].getValue()
        this.onThemeChange({},val);
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
        var tree = Ext.ComponentQuery.query('#areatree')[0];
        tree.view.dontRefreshSize = true;
        areaRoot.removeAll();
        tree.view.dontRefreshSize = false;
        var data = [];
        var currentLevel = [];
        var parentLevel = null;
        var level = null;
        this.addAreasToAreaMap(areasToAdd);
        var leafMap = {};
        this.lastLevel = areasToAdd.length ? areasToAdd[0].at : null;
        for (var i=0;i<areasToAdd.length;i++) {
            var area = areasToAdd[i];
            level = level || area.at;
            //area.children = [];
            if (area.at!=level) {
                level = area.at;
                this.lastLevel = area.at;
                parentLevel = currentLevel;
                currentLevel = [];
            }
            area.filterAttrs = {};
            for (var key in area) {
                if (key.search('as_')>-1 && area[key]) {
                    area.filterAttrs[key] = area[key].split(',');
                }
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
            area.expandable = false;
            
            var node = Ext.create('Puma.model.Area',area);
            node.updateInfo = function() {
                
            }
            if (!area.parentgid) {
                data.push(node);
            }
            else {
                for (var j=0;j<parentLevel.length;j++) {
                    if (parentLevel[j].get('joingid') == area.parentgid) {
                        parentLevel[j].set('expanded',true);
                        parentLevel[j].appendChild(node)
                    }
                }
            }
            currentLevel.push(node);
        }
        
        for (var i=0;i<data.length;i++) {
            areaRoot.appendChild(data[i],true);
        }
        
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
                if (node.get('loc')==loc && node.get('at')==prevAt && (node.get('gid')==parentgid || node.get('joingid')==parentgid)) {
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
        
        
    updateLayerContext: function() {
         var cfg = this.layerRefMap;
         var mapController = this.getController('Map');
         var years = Ext.ComponentQuery.query('#selyear')[0].getValue()
         var map1Year = mapController.map1.year;
         var map2Year = mapController.map2.year;
         mapController.map1.year = years.length>1 ? years[years.length-2] : years[years.length-1];
         mapController.map2.year = years.length>1 ? years[years.length-1] : null;
         var map1Change = map1Year != mapController.map1.year ? true : false;
         var map2Change = (map2Year != mapController.map2.year && mapController.map2.year) ? true : false
         
         var yearStore = Ext.StoreMgr.lookup('year');
         Ext.get('app-map-map-label').setHTML(yearStore.getById(mapController.map1.year).get('name'));
         Ext.get('app-map-map2-label').setHTML(mapController.map2.year ? yearStore.getById(mapController.map2.year).get('name') : '');
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
            me.initializeLayer(node,layer1,mapController.map1.year,cfg)
            me.initializeLayer(node,layer2,mapController.map2.year,cfg)
            
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
        layer.initialized = layers.length>0
            
        layers.sort();
        if (layers.length>0) {
            layer.mergeNewParams({
                layers: layers.join(','),
                styles: symbologies.join(',')
            })
        }
        var src = this.getController('Layers').getLegendUrl(layers[0],null,symbologyId);
        node.set('src',src)
        var distantLayers = node.get('layer1')==layer ? node.get('distantLayers') : [];
        for (var i=0;i<distantLayers.length;i++) {
            var distantLayer = distantLayers[i];
            distantLayer.initialized = layers.length>0;
            if (layers.length>0) {
                distantLayer.mergeNewParams({
                    layers: layers.join(','),
                    styles: symbologies.join(',')
                })
            }
            if (!layers.length) {
                distantLayer.setVisibility(false);
            }
            if (node.get('checked') && layers.length) {
                distantLayer.setVisibility(true);
            }
        }
        
        if (!layers.length) {
            layer.setVisibility(false);
        }
        if (node.get('checked') && layers.length) {
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
                    var distantLayers = node.get('distantLayers')
                    for (var k=0;k<distantLayers.length;k++) {
                        var distantLayer = distantLayers[k];
                        distantLayer.map.removeLayer(distantLayer);
                    }
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
        var topics = [];
        var nodesToAdd = [];
        for (var i = 0; i < layerNodes.length; i++) {
            var topic = layerNodes[i].topic;
            Ext.Array.include(topics, topic);
            if (Ext.Array.contains(this.topics, topic)) {
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
        var treeView = Ext.ComponentQuery.query('layerpanel')[0].view;
        if (treeView) {
            treeView.dontRefreshSize = true;
            
        }
        for (var i=0;i<childNodes.length;i++) {
            var node = childNodes[i];
            var type = node.get('type');

            if (type == 'systemgroup') {
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
                cls: 'nodehidden',
                checked: false,
                leaf: true
            }
            selectedLayerFilledNode = {
                type: 'selectedareasfilled',
                name: 'Selected areas filled',
                sortIndex: 0,
                cls: 'nodehidden',
                checked: true,
                leaf: true
            }
            areaLayerNode = {
                type: 'areaoutlines',
                sortIndex: 1,
                cls: 'nodehidden',
                name: 'Area outlines',
                checked: false,
                leaf: true
            }
            systemNode.appendChild([selectedLayerNode, selectedLayerFilledNode, areaLayerNode]);
        }



        var layersToAdd = [];

        var layerDefaults = this.getController('Layers').getWmsLayerDefaults();


        var mapController = this.getController('Map');
        for (var i = 0; i < root.childNodes.length; i++) {
            var node = root.childNodes[i];
            if (node.get('type') == 'thematicgroup' || node.get('type') == 'systemgroup') {
                for (var j = 0; j < node.childNodes.length; j++) {
                    var layerNode = node.childNodes[j];
                    if (layerNode.get('layer1'))
                        continue;
                    if (node.get('type') == 'thematicgroup' && !Ext.Array.contains(topics, layerNode.get('topic')))
                        continue;
                    Ext.Array.include(layersToAdd, layerNode);
                    var params = Ext.clone(layerDefaults.params);
                    var layerParams = Ext.clone(layerDefaults.layerParams);
                    if (node.get('type')=='thematicgroup') {
                        params.tiled = true;
                        delete layerParams.singleTile;
                        layerParams.tileSize = new OpenLayers.Size(256,256)
                        layerParams.removeBackBufferDelay = 0;
                        layerParams.transitionEffect = null;
                    }
                    var layer1 = new OpenLayers.Layer.WMS('WMS', Config.url + '/api/proxy/wms', Ext.clone(params), Ext.clone(layerParams));
                    var layer2 = new OpenLayers.Layer.WMS('WMS', Config.url + '/api/proxy/wms', Ext.clone(params), Ext.clone(layerParams));
                    if (node.get('type') == 'thematicgroup') {
                        layer1.events.register('visibilitychanged',{layer:layer1,me:this},function(a,b,c) {
                            this.me.getController('Layers').onLayerLegend(null,this.layer.nodeRec,this.layer.visibility);
                        })
                    }
                    mapController.map1.addLayers([layer1]);
                    mapController.map2.addLayers([layer2]);
                    layerNode.set('layer1', layer1);
                    layerNode.set('layer2', layer2);
                    layer1.nodeRec = layerNode;
                    layer2.nodeRec = layerNode;
                    var distantRegionsCmps = Ext.ComponentQuery.query('[type=distantregion]');
                    for (var k=0;k<distantRegionsCmps.length;k++) {
                        var distantMap = distantRegionsCmps[k].map;
                        var layerDistant = new OpenLayers.Layer.WMS('WMS', Config.url + '/api/proxy/wms', Ext.clone(params), Ext.clone(layerParams));
                        distantMap.addLayers([layerDistant]);
                        layerDistant.nodeRec = layerNode;
                        var distantLayers = layerNode.get('distantLayers') || [];
                        distantLayers.push(layerDistant);
                        layerNode.set('distantLayers',distantLayers);
                    }
                }
            }
        }
        Ext.StoreMgr.lookup('selectedlayers').loadData(layersToAdd, true);
        if (treeView) {
        treeView.dontRefreshSize = false;
        treeView.refreshSize();
        
        }
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
                node.set('leaf', true);
                node.set('expanded', false)
            }
            else if (node.get('leaf')) {
                node.set('leaf', false)
            }
        })

    },
        
    refreshFilters: function() {
        var filtersPanel = Ext.ComponentQuery.query('#codefilters')[0];
        if (this.initialized) {
            Ext.suspendLayouts();
            
        }
        
        var dataset = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var layer = this.lastLevel;
        var filtersObj = Ext.StoreMgr.lookup('datasetlayerfilters').queryBy(function(rec) {
            if (rec.get('featureLayer')==layer && rec.get('dataset')==dataset) return true;
        }).first();
        var attrs = [];
        if (filtersObj) {
            attrs = filtersObj.get('filters')
        }
//        else {
//            attrs = this.filterAttributes
//        }
        //filtersPanel.removeAll();
        var presentAttrs = [];
        var itemsToRemove = [];
       
        filtersPanel.items.each(function(cont) {
            
            if (!Ext.Array.contains(attrs,cont.attrId)) {
                itemsToRemove.push(cont);
            }
            else {
                presentAttrs.push(cont.attrId);
            }
        })
        for (var i=0;i<itemsToRemove.length;i++) {
            filtersPanel.remove(itemsToRemove[i]);
        }
        
        var attrStore = Ext.StoreMgr.lookup('attribute');
        var attrMap = {};
        for (var i=0;i<attrs.length;i++) {
            var code = 'as_'+this.filterAttrSet+'_attr_'+attrs[i];
            attrMap[code] = [];
        }
        if (attrs.length) {
            Ext.StoreMgr.lookup('area').getRootNode().cascadeBy(function(rec) {
                var filterAttrs = rec.get('filterAttrs');
                
                for (var code in filterAttrs) {
                    attrMap[code] = Ext.Array.merge(attrMap[code],filterAttrs[code]);
                }
            })
        }
        else {
            attrs.push('no');
        }
        console.log(attrMap)
        for (var i=0;i<attrs.length;i++) {
            var attr = attrs[i];
            if (Ext.Array.contains(presentAttrs,attr)) {
                continue;
            }
            var attrRec = attrStore.getById(attr);
            var code = 'as_'+this.filterAttrSet+'_attr_'+attr;
            var values = attrMap[code] || [];
            values.sort();
            var cont = {
//                layout: {
//                    type: 'vbox',
//                },
                defaults: {
                    margin: 2
                },
                xtype: 'container',
                width: 214,
                attrId: attr,
                //values: values,
                attrCode: code,
                margin: (i==attrs.length-1) ? '8 8 22 8' : 8,
                //padding: 8,
                items: [{
                    xtype: 'component',
                    html: '<b>'+(attrRec ? attrRec.get('name') : 'No filters available')+'</b>'
                }]  
            }
            
            for (var j=0;j<values.length;j++) {
                
                var value = values[j];
                
                cont.items.push({
                    xtype: 'button',
                    tooltip: value,
                    maxWidth: 214,
                    text: value,
                    enableToggle: true
                })
            }
            filtersPanel.insert(i,cont);
        }
        if (this.initialized) {
            Ext.resumeLayouts(true);   
        }
        
        
        
    },
    onThemeLocationConfReceived: function(response) {
        var conf = JSON.parse(response.responseText).data;
        if (response.request.options.originatingCnt.itemId == 'selectfilter') {
            this.getController('Select').selectInternal(conf.areas, false, false, 1);
            return;
        }
    
        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        var multiMapBtn = Ext.ComponentQuery.query('maptools #multiplemapsbtn')[0];
        multiMapBtn.leftYearsUnchanged = true;
        var multiMapPressed = multiMapBtn.pressed;
        //multiMapBtn.toggle(years.length > 1);
        // manually fire change handler, because nothing has changed
        if (years.length > 1 != this.wasMulti) {
            
            this.getController('Map').onMultipleYearsToggle(multiMapBtn, years.length>1);
        }
        this.wasMulti = years.length>1;
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
            if (!this.initialAdd) {
                
                //Ext.ComponentQuery.query('#areatree')[0].getView().refresh();
                
                this.initialAdd = true;
            }
        }
        if (conf.add || conf.remove) {
            var changed = this.refreshAreas(conf.add,conf.remove);
        }
        
        if (response.request.options.datasetChanged || this.treeChanged){
            
            //Ext.StoreMgr.lookup('area').sort();
            
            //Ext.ComponentQuery.query('#areatree')[0].getView().refresh();
            this.filterAttributes = conf.filterAttributes;
            this.filterAttrSet = conf.filterAttrSet;
            this.refreshFilters(conf);
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
            this.layerRefMap = conf.layerRefMap;
        }
        if (conf.layerRefMap || response.request.options.locationChanged) {
            this.updateLayerContext();
        }
        if (conf.leafMap && conf.add) {
            this.updateLeafs(conf.leafMap)
        }
        if (conf.areas || ((conf.add || conf.remove) && changed)) {
            this.getController('Area').scanTree();
            if (response.request.options.datasetChanged) {
                this.getController('Layers').colourMap();
            }
        }
        else if (response.request.options.yearChanged){
            this.getController('Layers').refreshOutlines();
            this.getController('Filter').reconfigureFiltersCall();
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
        this.treeChanged = false;
        if (!this.initialized) {
            Ext.resumeLayouts(true);
            this.initialized = true;
            
            Ext.ComponentQuery.query('toolspanel #selcolor')[0].collapse();
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
    
    
    
    reconfigureChartComboValues: function(attrSetId) {
        var combos = Ext.ComponentQuery.query('pumacombo[attributeCombo=1]');
        
        var attr = Ext.ComponentQuery.query('#selindicator')[0].getValue();
        for (var i=0;i<combos.length;i++) {
            var combo = combos[i];
            var val = combo.getValue();
            //if (val && (!Ext.isArray(val) || val.length)) continue;
           
                if (combo.cfgType=='columnchart') {
                    combo.setValue(attr);
                }
                if (combo.cfgType=='scatterchart' && !combo.alternative) {
                    combo.setValue(attr)
                }
                if (combo.cfgType=='scatterchart' && combo.alternative) {
                    combo.setValue(attr)
                }
                if (combo.cfgType!='boxplotchart') {
                    continue;
                    
                }
            
            var first = combo.store.getAt(0);
            var second = combo.store.getAt(1);
            if (!combo.alternative) {
                combo.setValue(attr);
            }
            if (combo.alternative) {
                combo.setValue(attr);
            }
        }
    },
    
    checkAttrSets: function(attrSets) {
        var chartController = this.getController('Chart')
        chartController.attrSet = null;
        chartController.attrSetId = null;
        var attrSetStore = Ext.StoreMgr.lookup('attributeset')
        var attrSetId = null;
        var attrSet = null;
        for (var i=0;i<attrSets.length;i++) {
            var attrSet = attrSetStore.getById(attrSets[i])
            if (attrSet.get('attributes') && attrSet.get('attributes').length) {
                attrSetId = attrSets[i];
                break;
            }
        }
        var visualization = Ext.StoreMgr.lookup('visualization').findRecord('attrSet',attrSetId);
        var attributes = attrSet.get('attributes');
        var store = Ext.StoreMgr.lookup('attribute4set');
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(attributes,rec.get('_id'));
        }])
        
        this.reconfigureChartComboValues(attrSetId);
        
        chartController.visualization = visualization;
        chartController.attrSet = attrSet;
        chartController.attrSetId = attrSetId;
        
        var choroAttrs = [];
        for (var i=0;i<attributes.length;i++) {
            var attr = attributes[i];
            choroAttrs.push({
                attr: attr,
                as: attrSetId,
                attrName: store.getById(attr).get('name'),
                numCategories: 5,
                classType: 'quantiles'
            })
        }
        var me = this;
        var layers = visualization ? visualization.get('layers') : null;
        if (layers) {
            var topicLayerGroup = Ext.StoreMgr.lookup('layers').getRootNode().findChild('type','thematicgroup');
            for (var i=0;i<layers.length;i++) {
                var atSymb = layers[i].at+'_'+layers[i].symbologyId;
                var layer = topicLayerGroup.findChild('atWithSymbology',atSymb);
                if (layer) {
                    window.setTimeout(function() {
                        layer.set('checked',true);
                        me.getController('Layers').onCheckChange(layer,true);
                    },1000)
                    
                }
            }
        }
        this.getController('Layers').reconfigureChoropleths({attrs:choroAttrs},visualization);
        this.getController('Filter').reconfigureFilters({attrs:choroAttrs})
        
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

