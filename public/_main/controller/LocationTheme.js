Ext.define('PumaMain.controller.LocationTheme', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            'initialbar #focuscontainer button': {
                toggle: this.onFocusChange
            },
            'initialbar #locationcontainer button': {
                toggle: this.onLocationChange
            },
            'initialbar #themecontainer button': {
                toggle: this.onThemeChange
            },
            'initialbar #yearcontainer button': {
                toggle: this.onYearChange
            },
            'initialbar #treecontainer button': {
                toggle: this.onTreeChange
            },
            'initialbar #visualizationcontainer button': {
                toggle: this.onVisualizationChange
            },
            
        })
    },
        
    onFocusChange: function(btn, value) {
        if (!value)
            return;
        var id = btn.objId;
        var locations = Ext.StoreMgr.lookup('location').query('scope',id).getRange();
        var cfgs = [];
        for (var i=0;i<locations.length;i++) {
            var location = locations[i];
            cfgs.push({text:location.get('name'),objId:location.get('_id'),allowDepress:false,pressed:i==0})
        }
        cfgs.sort(function(a,b) {
            return a.objId>b.objId
        })
        var locContainer = Ext.ComponentQuery.query('initialbar #locationcontainer')[0];
        var buttons = Ext.ComponentQuery.query('initialbar #locationcontainer button')
        for (var i=0;i<buttons.length;i++) {
            locContainer.remove(buttons[i])
        }
        locContainer.add(cfgs);
        var locBtn = Ext.ComponentQuery.query('initialbar #locationcontainer button[pressed=true]')[0];
        this.onLocationChange(locBtn,true);
        
    },
        
    onLocationChange: function(btn, value) {
        if (!value)
            return;
        Ext.Ajax.extraParams = Ext.Ajax.extraParams || {};
        Ext.Ajax.extraParams['location'] = btn.objId;
        var location = Ext.StoreMgr.lookup('location').getById(btn.objId);
        var map = Ext.ComponentQuery.query('#map')[0].map;
        var bbox = location.get('bbox').split(',');
        var bounds = new OpenLayers.Bounds(bbox[0], bbox[1], bbox[2], bbox[3]).transform(new OpenLayers.Projection('EPSG:4326'), map.projection);
        map.zoomToExtent(bounds);
        var scopeBtn = Ext.ComponentQuery.query('initialbar #focuscontainer button[pressed=true]')[0];
        var themesToAdd = [];
        var store = Ext.StoreMgr.lookup('theme')
        var themes = store.query('scope',scopeBtn.objId).getRange();
        for (var i=0;i<themes.length;i++) {
            var theme = themes[i];
            themesToAdd.push(theme.get('_id'));
        }
        themesToAdd.sort();
        var themeBtns = Ext.ComponentQuery.query('initialbar #themecontainer button');
        var presentIds = [];
        var containsActive = false;
        for (var i=0;i<themeBtns.length;i++) {
            var themeBtn = themeBtns[i];
            var btnId = themeBtn.objId;
            if (!Ext.Array.contains(themesToAdd,btnId)) {
                themeBtn.ownerCt.remove(themeBtn);
                continue;
            }
            if (themeBtn.pressed) {
                containsActive = true;
            }
            presentIds.push(btnId);
        }
        themesToAdd = Ext.Array.difference(themesToAdd,presentIds);
        var themeObjsToAdd = [];
        for (var i=0;i<themesToAdd.length;i++) {
            themeObjsToAdd.push(store.getById(themesToAdd[i]))
        }
        
        themeObjsToAdd.sort(function(theme1,theme2) {
            var s1 = theme1.get('sortIndex');
            var s2 = theme2.get('sortIndex');
            return s1>s2;
        })
        
        var confs = [];
        for (var i=0;i<themeObjsToAdd.length;i++) {
            var theme = themeObjsToAdd[i];
            confs.push({text:theme.get('name'),objId:theme.get('_id'),allowDepress:false})
        }
        var container = Ext.ComponentQuery.query('initialbar #themecontainer')[0]
        container.add(confs)
        
        if (containsActive) {
            this.onThemeChange(btn,true,true);
        }
        else {
            this.deleteButtons(['year','tree','visualization']);
            var node = Ext.StoreMgr.lookup('area').getRootNode()
            node.removeAll();
            this.getController('Area').scanTree();
            this.getController('Chart').loadVisualization('custom');
            Ext.StoreMgr.lookup('layers').getRootNode().removeAll();
        }
            
    },
        
    onThemeChange: function(btn,value) {
        if (!value) return;
        var themeBtn = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0];
        
        var yearBtns = Ext.ComponentQuery.query('initialbar #yearcontainer button');
        var presentIds = [];
        var containsActive = false;
        
        //var years = theme.get('years');
        var yearStore = Ext.StoreMgr.lookup('year');
        var years = yearStore.collect('_id')
        for (var i=0;i<yearBtns.length;i++) {
            var yearBtn = yearBtns[i];
            var btnId = yearBtn.objId;
            if (!Ext.Array.contains(years,btnId)) {
                yearBtn.ownerCt.remove(yearBtn);
                continue;
            }
            if (yearBtn.pressed) {
                containsActive = true;
            }
            presentIds.push(btnId);
        }
        var yearsToAdd = Ext.Array.difference(years,presentIds);
        var confs = [];
        for (var i=0;i<yearsToAdd.length;i++) {
            var year = yearStore.getById(yearsToAdd[i]);
            confs.push({text:year.get('name'),objId:year.get('_id'),allowDepress:false})
        }
        confs.sort(function(a,b) {
            return a.objId > b.objId
        })
        var container = Ext.ComponentQuery.query('initialbar #yearcontainer')[0]
        container.add(confs);
        var forcedYearChange = false;
        if (!containsActive) {
            Ext.ComponentQuery.query('initialbar #yearcontainer button')[0].toggle(true,true);
            forcedYearChange = true;
        }
        this.onYearChange(btn,true,forcedYearChange);
        
    },
        
    onYearChange: function(btn,value,forcedYearChange) {
        if (!value) return;
        this.requestNewLayers(btn,forcedYearChange===true);
    },
        
    deleteButtons: function(containerNames) {
        for (var i=0;i<containerNames.length;i++) {
            var name = containerNames[i]+'container';
            var buttons = Ext.ComponentQuery.query('initialbar #'+name+' button');
            for (var j=0;j<buttons.length;j++) {
                buttons[j].destroy();
            }
        }
    },
    
    requestNewLayers: function(originatingButton,forcedYearChange) {
        var themeBtn = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0];
        var locationBtn = Ext.ComponentQuery.query('initialbar #locationcontainer button[pressed=true]')[0];
        var yearBtn = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0];
        if (!themeBtn || !locationBtn)
            return;
        Ext.Ajax.request({
            url: Cnst.url+'/api/theme/getThemeLocationConf',
            params: {
                theme: themeBtn.objId,
                year: yearBtn.objId
            },
            scope: this,
            originatingButton: originatingButton,
            forcedYearChange: forcedYearChange,
            success: this.onThemeLocationConfReceived
        })
    },
    onThemeLocationConfReceived: function(response) {
        var btn = response.request.options.originatingButton;
        var conf = JSON.parse(response.responseText).data;
        this.getController('Area').areaTemplateMap = conf.areaTemplateMap;
        var itemId = btn.ownerCt.itemId;
        if (itemId == 'themecontainer') {
            this.getController('Layers').reinitializeLayers(conf.layers);
        }
        else if (itemId != 'themecontainer' || response.request.options.forcedYearChange) {
            this.getController('Layers').reconfigureLayers();
        }
        var mc = this.getController('Map');
        mc.drawnLayer.destroyFeatures();
        if (conf.userPolygons) {
            var format = new OpenLayers.Format.WKT();
            
            for (var featureId in conf.userPolygons.geometries) {
                var obj = conf.userPolygons.geometries[featureId];
                var feature = format.read(obj.geom);
                feature.gid = parseInt(featureId);
                mc.drawnLayer.addFeatures([feature]);
            }
        }
        this.reinitializeTreesAreas(conf.areaTrees,btn)
    },
    reinitializeTreesAreas: function(treeConf,btn) {
        var container = Ext.ComponentQuery.query('initialbar #treecontainer')[0];
        
        var confMap = {};
        var trees = [];
        var containsUserPolygon =false;
        for (var i=0;i<treeConf.length;i++) {
            trees.push(treeConf[i].objId);
            if (treeConf[i].objId==-1) {
                containsUserPolygon = true;
            }
            treeConf[i].allowDepress = false;
            confMap[treeConf[i].objId] = treeConf[i];
        }
        var visStore = Ext.StoreMgr.lookup('areas4visualization');
        if (containsUserPolygon) {
            var rec = visStore.getById(-1);
            if (!rec) {
                var rec = new Puma.model.Aggregated({
                    _id: -1,
                    name: 'User polygon'
                })
                visStore.add(rec);
            }
        }
        else {
            var rec = visStore.getById(-1);
            if (rec) {
                visStore.remove(rec);
            }
        }
        var treeBtns = Ext.ComponentQuery.query('initialbar #treecontainer button');
        var presentIds = [];
        var containsActive = false;
        
        for (var i=0;i<treeBtns.length;i++) {
            var treeBtn = treeBtns[i];
            var btnId = treeBtn.objId;
            if (!Ext.Array.contains(trees,btnId)) {
                treeBtn.ownerCt.remove(treeBtn);
                continue;
            }
            if (treeBtn.pressed) {
                containsActive = true;
            }
            presentIds.push(btnId);
        }
        var treesToAdd = Ext.Array.difference(trees,presentIds);
        var confs = [];
        for (var i=0;i<treesToAdd.length;i++) {
            confs.push(confMap[treesToAdd[i]])
        }
        var container = Ext.ComponentQuery.query('initialbar #treecontainer')[0];
        container.add(confs);
        
        if (!containsActive) {
            this.deleteButtons(['visualization'])
            var node = Ext.StoreMgr.lookup('area').getRootNode();
            node.removeAll();
            this.getController('Area').scanTree();
            this.getController('Chart').loadVisualization('custom');
        }
        else {
            this.onTreeChange(btn,true);
        }
        
            
    },
        
    onTreeChange: function(btn,value) {
        if (!value) return;
        var visStore = Ext.StoreMgr.lookup('visualization')
        var visualizations = visStore.getRange();
        var activeVisualizationsIds = [];
        
        var theme = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0].objId;
        var tree = Ext.ComponentQuery.query('initialbar #treecontainer button[pressed=true]')[0].objId;
        var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
        var visBtns = Ext.ComponentQuery.query('initialbar #visualizationcontainer button');
        
        
        for (var i=0;i<visualizations.length;i++) {
            var vis = visualizations[i];
            if (vis.get('theme') == theme && Ext.Array.contains(vis.get('areas'),tree)) {
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
            var btnToActivate = Ext.ComponentQuery.query('initialbar #visualizationcontainer button')[0]
            btnToActivate.toggle(true,true);
            forceVisReinit = true;
        }
        var me = this;
        var themeObj = Ext.StoreMgr.lookup('theme').getById(theme);
        var analysis = themeObj.get('analysis');
        if (tree==-1) {
            return this.checkUserPolygons([year],analysis,function() {
                me.onVisualizationChange(btn,true,forceVisReinit);
            })
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
            this.getController('Chart').loadVisualization(vis);
            visChanged = true;
        }
        
        
        
        if (Ext.Array.contains(['treecontainer','locationcontainer'],itemId)) {
            this.getController('Area').reinitializeTree();
            this.getController('Layers').checkVisibilityAndStyles(!visChanged,false);     
            return;
        }
        var preserveVis = false;
        if (itemId == 'yearcontainer') {
            this.getController('Area').scanTree();
            preserveVis = true;
        }
        this.getController('Layers').checkVisibilityAndStyles(!visChanged,preserveVis);
        this.getController('Chart').reconfigureAll();
        
    }

});

