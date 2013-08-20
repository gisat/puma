Ext.define('PumaMain.controller.Map', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            '#map': {
                afterrender: this.afterRender,
                resize: this.onResize,
            },
            '#map2': {
                afterrender: this.afterRender,
                resize: this.onResize
            },
            'component[type=extentoutline]': {
                afterrender: this.afterExtentOutlineRender,
                resize: this.onResize
            },
            '#zoomselectedbtn': {
                click: this.onZoomSelected
            },
            'initialbar #featureinfobtn': {
                toggle: this.onFeatureInfoActivated
            },
            '#measurelinebtn': {
                toggle: this.onMeasureActivated
            },
            '#measurepolygonbtn': {
                toggle: this.onMeasureActivated
            },
            '#multiplemapsbtn': {
                toggle: this.onMultipleYearsToggle
            },
            'layermenu #url': {
                click: this.onExportMapUrl
            },
            'layermenu #exportpng': {
                click: this.onExportMapUrl
            }
        })
    },
        
    onExportMapUrl: function(btn) {
        var map = btn.up('layermenu').map;
        var layerStore = Ext.StoreMgr.lookup('selectedlayers');
        var useFirst = layerStore.getAt(0).get('layer1').map == map;
        var mapCfg = {};
        var layers = [];
        var me = this;
        layerStore.each(function(rec) {
            
            var layer = rec.get(useFirst ? 'layer1' : 'layer2');
            
            var sldId = layer.params ? layer.params['SLD_ID'] : null;
            var layersParam = layer.params ? layer.params['LAYERS'] : null;
            var obj = {
                type: rec.get('type'),
                opacity: layer.opacity || 1
            }
            var at = rec.get('at');
            var attrSet = rec.get('attributeSet');
            var attr = rec.get('attribute');
            var bindChart = rec.get('bindChart');
            if (attrSet) {
                obj.as = attrSet;
                obj.attr = attr;
                var cfg = me.getController('Chart').gatherChartCfg(bindChart);
                obj.bindChart = JSON.stringify(cfg)
            }
            if (at) {
                obj.at = at;
            }
            if (sldId) {
                obj.sldId = sldId;
            }
            if (layersParam) {
                obj.layers = layersParam;
            }
            layers.push(obj);
        })
        mapCfg = {
            layers: layers,
            type: 'map',
            year: map.year,
            center: map.center,
            size: map.size,
            zoom: map.zoom
        }
        Ext.Ajax.request({
            url: Cnst.url + '/api/urlview/saveChart',
            params: {
                cfg: JSON.stringify(mapCfg)
            },
            scope: this,
            method: 'POST',
            success: function(response) {
                var id = JSON.parse(response.responseText).data;
                this.getController('Chart').onUrlCallback(id,btn.itemId=='url')
            }
        })
    },
    
    onMultipleYearsToggle: function(btn,pressed) {
        this.switchMap(pressed);
    },
    
    switchMap: function(both,second) {
        var map1 = Ext.ComponentQuery.query('#map')[0];
        var map2 = Ext.ComponentQuery.query('#map2')[0];
        if (both) {
            map1.show();
            map2.show();
        }
        else if (second) {
            
            map1.hide();
            map2.show();
        }
        else {
            map2.hide();
            map1.show();
        }
    },
    onFeatureInfoActivated: function(btn,val) {
        // tady na to pozor layer uy nevisi na controlleru
        if (val) {
            this.map1.featureInfoControl.activate();
        }
        else {
            this.map1.featureInfoControl.deactivate();
        }
    },
        
    onMeasureActivated: function(btn,val) {
        // tady na to pozor layer uy nevisi na controlleru
        var control1 = btn.itemId == 'measurelinebtn' ? this.map1.measureLineControl : this.map1.measurePolyControl;
        var control2 = btn.itemId == 'measurelinebtn' ? this.map2.measureLineControl : this.map2.measurePolyControl;
        
        var window = Ext.WindowManager.get('measureWindow');
        if (val) {
            if (!window) {
                window = Ext.widget('window',{
                    padding: 5,
                    minWidth: 140,
                    closable: false,
                    maxWidth: 220,
                    bodyPadding: 5,
                    closeAction: 'hide',
                    html: (btn.itemId == 'measurelinebtn' ? 'Length' : 'Area') + ":",
                    id: 'measureWindow'
                })
            }
            window.show();
            window.body.dom.innerHTML = (btn.itemId == 'measurelinebtn' ? 'Length' : 'Area') + ":",
            control1.activate();
            control2.activate();
        }
        else {
            if (window) {
                window.close();
            }
            control1.deactivate();
            control2.deactivate();
        }
    },
        
    onZoomSelected: function(btn) {
        var selectController = this.getController('Select');
        var color = selectController.actualColor;
        var sel = color ? selectController.selMap[color] : [];
        if (!sel.length) return;
        var areaController = this.getController('Area');
        var format = new OpenLayers.Format.WKT();
        var overallExtent = null;
        for (var i=0;i<sel.length;i++) {
            var area = areaController.getArea(sel[i]);
            var extent = format.read(area.get('extent')).geometry.getBounds();
            extent = extent.transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"))
            if (!overallExtent) {
                overallExtent = extent;
            }
            else {
                overallExtent.extend(extent)
            }
        }
        var map = Ext.ComponentQuery.query('#map')[0].map;
        map.zoomToExtent(overallExtent);
        
    },
    
    createBaseNodes: function() {
        var baseNode = Ext.StoreMgr.lookup('layers').getRootNode().findChild('type','basegroup');
        var hybridNode = Ext.create('Puma.model.MapLayer',{
            name: 'Google hybrid',
            checked: true,
            allowDrag: false,
            initialized: true,
            leaf: true,
            sortIndex: 10000,
            type: 'hybrid'
        });
        var streetNode = Ext.create('Puma.model.MapLayer',{
            name: 'Google street',
            initialized: true,
            allowDrag: false,
            checked: false,
            leaf: true,
            sortIndex: 10000,
            type: 'roadmap'
        });
        var terrainNode = Ext.create('Puma.model.MapLayer',{
            name: 'Google terain',
            initialized: true,
            allowDrag: false,
            checked: false,
            leaf: true,
            sortIndex: 10000,
            type: 'terrain'
        });
        
        Ext.StoreMgr.lookup('selectedlayers').loadData([hybridNode,streetNode,terrainNode],true);
        baseNode.appendChild([hybridNode,streetNode,terrainNode]);
        
    },
    
    onMapMove: function(mapId) {
        return;
        var mapMoved = mapId=='map' ? this.map1 : this.map2;
        var mapAlt = mapId=='map' ? this.map2 : this.map1;
        if (!mapMoved || !mapAlt) return;
        if (mapMoved.artifZoom) {
            mapMoved.artifZoom = false;
            return;
        }
        mapAlt.artifZoom = true;
        mapAlt.setCenter(mapMoved.getCenter(),mapMoved.getZoom());
        mapAlt.artifZoom = false;
    },
    
    afterExtentOutlineRender: function(cmp) {
        var options = this.getOptions(cmp);
        options.controls = [];
        //options.maxExtent=  new OpenLayers.Bounds(-2037508, -2037508, 2037508, 2037508.34)
        var map = new OpenLayers.Map(options);
        
        cmp.map = map;
        var hybridLayer = new OpenLayers.Layer.Google(
                'Google',
                {
                    type: 'hybrid',
                    initialized: true,
                    animationEnabled: true
                }
        );
        var layerDefaults = this.getController('Layers').getWmsLayerDefaults();
        map.layer1 = new OpenLayers.Layer.WMS('WMS', Cnst.url + '/api/proxy/wms', Ext.clone(layerDefaults.params), Ext.clone(layerDefaults.layerParams));
        map.layer2 = new OpenLayers.Layer.WMS('WMS', Cnst.url + '/api/proxy/wms', Ext.clone(layerDefaults.params), Ext.clone(layerDefaults.layerParams));

        map.addLayers([hybridLayer, map.layer1, map.layer2]);
        var counterObj = {cnt:0, desired: 3}
        var me = this;
        google.maps.event.addListener(hybridLayer.mapObject, 'tilesloaded', function() {
            counterObj.cnt++;
            if (counterObj.cnt == counterObj.desired) {
                me.onExtentOutlineComplete(cmp)
            }
        })
        for (var i=0;i<2;i++) {
            var layer = map['layer'+(i+1)];
            layer.events.register('loadend', null, function(a, b) {
                    counterObj.cnt++;
                    if (counterObj.cnt == counterObj.desired) {
                        me.onExtentOutlineComplete(cmp)
                    }
                });
        }
        
        
        
        var layerRefs = cmp.layerRefs;
        var rows = cmp.rows;
        var format = new OpenLayers.Format.WKT();
        var filters = [];
        var overallExtent = null;
        for (var j = 0; j < rows.length; j++) {
            var row = rows[j];
            var filter = new OpenLayers.Filter.Comparison({type: '==', property: 'gid', value: row.gid});
            filters.push(filter);
            var extent = format.read(row.extent).geometry.getBounds();
            extent = extent.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"))
            if (!overallExtent) {
                overallExtent = extent;
            }
            else {
                overallExtent.extend(extent)
            }
        }
        var filter = filters.length < 2 ? filters[0] : new OpenLayers.Filter.Logical({type: '||', filters: filters});
        var style = new OpenLayers.Style();
        var layerName = 'puma:layer_' + layerRefs.areaRef._id;

        var rule = new OpenLayers.Rule({
            symbolizer: {"Polygon": new OpenLayers.Symbolizer.Polygon({fillOpacity: 0, strokeOpacity: 1, strokeColor: '#ff0000'})},
            filter: filter
        });
        style.addRules([rule]);
        var namedLayers = [{
                name: layerName,
                userStyles: [style]
            }];
        var sldObject = {
            name: 'style',
            title: 'Style',
            namedLayers: namedLayers
        }
        var format = new OpenLayers.Format.SLD.Geoserver23();
        var sldNode = format.write(sldObject);
        var xmlFormat = new OpenLayers.Format.XML();
        var sldText = xmlFormat.write(sldNode);
        map.layer1.mergeNewParams({
            layers: layerRefs.layerRef.layer
        })
        map.layer2.mergeNewParams({
            "USE_SECOND": true,
            "SLD_BODY": sldText
        })
        map.updateSize();
        
        map.layer1.setVisibility(true);
        map.layer2.setVisibility(true);
        map.zoomToExtent(overallExtent);
        map.outlineExtent = overallExtent;
    },
        
    onExtentOutlineComplete: function(cmp) {
        cmp.mapLoaded = true;
        var loaded = true;
        cmp.ownerCt.items.each(function(mapCmp) {
            if (!mapCmp.mapLoaded) {
                loaded = false;
                return false;
            }
        })
        if (loaded) {
            console.log('loadingdone');
        }
    },
        
    getOptions: function(cmp) {
        var options = {
            projection: new OpenLayers.Projection("EPSG:900913"),
            displayProjection: new OpenLayers.Projection("EPSG:4326"),
            units: "m",
            numZoomLevels: 22,
            maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
            featureEvents: true,
            allOverlays: true,
            div: cmp.id
        };
        return options;
    },
    
    afterRender: function(cmp) {
        var options = this.getOptions(cmp);
        var map = new OpenLayers.Map(options);
        cmp.map = map;
        var el = Ext.get(cmp.id);
        el.on('contextmenu',function(e) {
            
            
            e.stopEvent();
            var layerMenu = Ext.widget('layermenu', {
                map: map
            })
        
            layerMenu.showAt(e.getXY());
        })
        if (cmp.itemId=='map') {
            this.createBaseNodes();
            this.map1 = map;
            
        }
        else {
            this.map2 = map;
        }
        
        var hybridLayer = new OpenLayers.Layer.Google(
                'Google',
                {
                    type: 'hybrid',
                    initialized: true,
                    animationEnabled: true
                }
        );
        map.defaultLayer = layer;
        var streetLayer = new OpenLayers.Layer.Google(
                'Google',
                {
                    type: 'roadmap',
                    animationEnabled: true,
                    initialized: true,
                    visibility: false
                }
        );
        var terrainLayer = new OpenLayers.Layer.Google(
                'Google',
                {
                    type: 'terrain',
                    animationEnabled: true,
                    initialized: true,
                    visibility: false
                }
                    
        );
        var baseNode = Ext.StoreMgr.lookup('layers').getRootNode().findChild('type','basegroup');
        var nodes = [];
        for (var i=0;i<baseNode.childNodes.length;i++) {
            var node = baseNode.childNodes[i];
            var layer = null;
            var type = node.get('type');
            switch(type) {
                case 'hybrid': layer = hybridLayer; break;
                case 'roadmap': layer = streetLayer; break;
                case 'terrain': layer = terrainLayer; break;
            }
            var nodeProp = cmp.itemId=='map' ? 'layer1':'layer2';
            node.set(nodeProp,layer);
        }
        
   
        
        map.drawnLayer = new OpenLayers.Layer.Vector('',{
            style: {
                fillOpacity: 0,
                strokeWidth: 3,
                strokeColor: '#ff8800',
                strokeOpacity: 0.8,
                pointRadius: 2
            }
        })
        //bbox: 112.337169,-7.954641,112.977462,-7.029791
        //debugger;
        map.size = map.getCurrentSize();
        map.addLayers([terrainLayer,streetLayer,hybridLayer]);
        
        if (cmp.id=='map') {
            Ext.StoreMgr.lookup('selectedlayers').loadData(nodes,true);
        }
        
        map.events.register('moveend',this,function(a) {
            this.onMapMove(a.object.div.id);
        })
        
        map.updateSize();
        map.zoomToExtent(new OpenLayers.Bounds(-675736.2753,9187051.894,704022.2164,9204621.9448))
        
        var params = {
            transparent: true,
            format: 'image/png',
            info_format: 'application/vnd.ogc.gml'
        }
        //params.layers = 'puma:layer_260,puma:layer_266'
        

        map.selectInMapLayer = new OpenLayers.Layer.WMS('WMS', Cnst.url+'/api/proxy/wms', params, {
            visibility: true
        });
        map.selectInMapLayer.projection = map.projection;
        
        map.getFeatureInfoLayer = new OpenLayers.Layer.WMS('WMS', Cnst.url+'/api/proxy/wms', params, {
            visibility: true
        });
        map.getFeatureInfoLayer.projection = map.projection;
        
        var infoControls = {
            click: new OpenLayers.Control.WMSGetFeatureInfo({
                url: Cnst.url+'/api/proxy/wms', 
                vendorParams: {
                    propertyName: 'gid'
                },
                layers: [map.selectInMapLayer]
            }), 
            hover: new OpenLayers.Control.WMSGetFeatureInfo({
                url: Cnst.url+'/api/proxy/wms', 
                vendorParams: {
                    propertyName: 'gid',
                    buffer: 1
                },
                layers: [map.selectInMapLayer],
                hover: true
            })
        };
        map.featureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
                url: Cnst.url+'/api/proxy/wms', 
                vendorParams: {
                    propertyName: 'gid',
                    buffer: 1,
                    completeLayer: true
                },
                layers: [map.getFeatureInfoLayer]
            })
        map.drawPolygonControl = new OpenLayers.Control.DrawFeature(
            map.drawnLayer,
            OpenLayers.Handler.Polygon
        )
        map.drawPointControl = new OpenLayers.Control.DrawFeature(
            map.drawnLayer,
            OpenLayers.Handler.Point
        )
        map.selectControl = new OpenLayers.Control.SelectFeature(
            map.drawnLayer,
            {
                highlightOnly: true
            }
            
        )
        map.dragControl = new OpenLayers.Control.DragFeature(
            map.drawnLayer,{
                geometryTypes:['OpenLayers.Geometry.Point']
            }
            )
            
        
        var me = this; 
        var measureCallbacks = {
            'modify':function(point,feature) {
                me.handleMeasureModify(point,feature,this);
            }
        }
        map.measurePolyControl =  new OpenLayers.Control.Measure(
            OpenLayers.Handler.Polygon,
            {
                geodesic: true,
                persist: true,
                callbacks: measureCallbacks
            }
            );
        map.measureLineControl =  new OpenLayers.Control.Measure(
            OpenLayers.Handler.Path,
            {
                geodesic:true,
                persist: true,
                callbacks: measureCallbacks
            }
            );
        
        
        map.addControls([map.drawPolygonControl,map.drawPointControl,map.selectControl,map.dragControl,map.featureInfoControl,map.measurePolyControl,map.measureLineControl]);
        map.dragControl.activate();
        map.dragControl.onComplete = function(feature) {
            me.getController('UserPolygon').onFeatureDragged(feature);
        }
        //this.drawPolygonControl.activate();
        for (var i in infoControls) { 
            infoControls[i].events.register("getfeatureinfo", this, this.onFeatureSelected);
            map.addControl(infoControls[i]); 
        }
        
        map.featureInfoControl.events.register('beforegetfeatureinfo',this,function() {
            return this.updateFeatureInfoControl()
        });
        map.featureInfoControl.events.register("getfeatureinfo", this, function(response) {
            return this.onFeatureInfo(response);
        });
        map.measureLineControl.events.register('measurepartial',this,function(obj) {
            return this.onMeasurePartial(obj);
        });
        map.measurePolyControl.events.register('measurepartial',this,function(obj) {
            return this.onMeasurePartial(obj);
        });
        
        
        //infoControls.hover.activate();
        //infoControls.click.activate();
        map.infoControls = infoControls
    },
        
    onMeasurePartial: function(evt) {
        var html = (evt.order == 1 ? 'Length' : 'Area' )+': ';
        if (evt.measure == 0) return;
        
        var fixedNum = evt.measure<10000 ? 1 : 0;
        fixedNum = evt.measure<100 ? 2 : fixedNum;
        html += evt.measure.toFixed(fixedNum);
        html += ' ';
        html += evt.units;
        html += evt.order == 2 ? '<sup>2</sup>' : '';
        var window = Ext.WindowManager.get('measureWindow');
        window.body.dom.innerHTML = html;
    },
        
    onFeatureInfo: function(response) {
        var data = JSON.parse(response.text).data;
        if (!data || !data.length) {
            return;
        }
        var window = Ext.WindowManager.get('featureinfowindow');
        if (!window) {
            window = Ext.widget('window',{
                layout: 'fit',
                width: 400,
                maxHeight: 600,
                id: 'featureinfowindow',
                items: [{
                    xtype: 'treepanel',
                    rootVisible: false,
                    columns: [{
                        xtype: 'treecolumn',
                        flex: 1,
                        dataIndex: 'name',
                        renderer: function(val,metaData,record) {
                            if (record.get('attrSet')==-1) {
                                metaData.style = 'font-weight:bold'
                            }
                            return val;
                        },
                        header: 'Name'
                    },{
                        dataIndex: 'value',
                        flex: 1,
                        header: 'Value'
                    }],
                    store: Ext.create('Ext.data.TreeStore',{
                        fields: ['name','value','attrSet']
                    })
                }]
                
            })
        }
        var store = window.items.get(0).store;
        store.getRootNode().removeAll(false,true);
        store.getRootNode().appendChild(data);
        window.show();
    },
    
    updateFeatureInfoControl: function() {
        var store = Ext.StoreMgr.lookup('layers');
        
        var root = store.getRootNode();
        var layerRefMap = this.getController('Area').areaTemplateMap;
        var layers = [];
        return;
        root.cascadeBy(function(node) {
            if (!node.get('checked')) return;
            var at = node.get('bindAt');
            var layerRef = layerRefMap[at];
            if (!layerRef || !layerRef.fidColumn) {
                at = node.get('at');
            }
            layerRef = layerRefMap[at];
            var layerName = node.get('layerName');
            if (!layerName || (!layerRef || !layerRef.fidColumn) && at!=-1) return;
            var layerName = (layerRef ? 'layer_'+layerRef._id : layerName);
            if (!layerName) return;
            layers.push('puma:'+layerName)
        })
        if (!layers.length) {
            return false;
        }
//        for (var loc in layerRefMap) {
//            for (var )
//        }
//        layers = layers.join(',');
        // tady na to pozor layer uy nevisi na controlleru
        this.map1.getFeatureInfoLayer.params['LAYERS'] = layers;
        this.map2.getFeatureInfoLayer.params['LAYERS'] = layers;
    },
    
    updateGetFeatureControl: function() {
        
        var layers1 = [];
        var layers2 = [];
        var controller = this.getController('Area');
        var areaTemplates = controller.areaTemplates;
        var areaTemplateMap = controller.areaTemplateMap;
        
        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        if (!years.length) {
            return;
        }
        
        var locations = this.getController('Area').getTreeLocations();
        var lrMap = {};
        for (var i=0;i<areaTemplates.length;i++) {
            var at = areaTemplates[i]
            if (at==-1) {
                var location = Ext.ComponentQuery.query('initialbar #locationcontainer button[pressed=true]')[0].objId;
                var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
                var layer = 'puma:#userpolygon#layer_user_#userid#_loc_'+location+'_y_'+year;
            }
            var atMap = areaTemplateMap[at] || {};
            for (var j=0;j<locations.length;j++) {
                var loc = locations[j];
                var locMap = areaTemplateMap[loc] || {};
                var atMap = locMap[at] || {};
                var lr1 = atMap[years[0]];
                var lr2 = years.length>1 ? atMap[years[1]] : null;
                if (lr1) {
                    lrMap[lr1._id] = {at:at,loc:loc};
                    var layer = 'puma:layer_'+lr1._id;
                    layers1.push(layer)
                }
                if (lr2) {
                    lrMap[lr2._id] = {at:at,loc:loc};
                    var layer = 'puma:layer_'+lr2._id;
                    layers2.push(layer)
                }
                
            }
        }
        this.lrMap = lrMap;
        this.map1.selectInMapLayer.params['LAYERS'] = layers1.join(',');
        this.map2.selectInMapLayer.params['LAYERS'] = layers2.join(',');
    },
        
    onFeatureSelected: function(evt) {
        var features = JSON.parse(evt.text).features;
        if (features && features.length) {
             var controller = this.getController('Area')
             var areaTemplates = controller.areaTemplates;
             var areaTemplateMap = controller.areaTemplateMap;
             var lrs = [];
             features.reverse();
             var root = Ext.StoreMgr.lookup('area').getRootNode();
             var gid = null;
             var at = null;
             var loc = null;
             for (var i=0;i<features.length;i++) {
                 var feature = features[i];
                 gid = feature.properties.gid;
                 var layerName = feature.id.split('.')[0];
                 var lr = null;
                 if (layerName.indexOf('user')>=0) {
                    at = -1; 
                    break;
                 }
                 else {       
                    lr = parseInt(layerName.split('_')[1]);
                 }
                 var featureAt = this.lrMap[lr].at;
                 var featureLoc = this.lrMap[lr].loc;
                 var found = false;
                 root.cascadeBy(function(node) {
                    if (!node.isVisible()) return;
                    if (node.get('at')==featureAt && node.get('gid')==gid && node.get('loc')==featureLoc) {
                        found = true;
                        at = node.get('at');
                        loc = node.get('loc')
                        return false;
                    }
                 })
                 if (found) {
                     break;
                 } 
             }
             
             var selected = [];
             if (at && loc && gid) {
                 selected.push({at:at,gid:gid,loc:loc})
             }
             var add = evt.object.handler.evt.ctrlKey;
             var hover = evt.object.hover;
             this.getController('Select').select(selected,add,hover);             
        } 
        else {
             var add = evt.object.handler.evt.ctrlKey;
             var hover = evt.object.hover;
             this.getController('Select').select([],add,hover);    
        }
    },
    
    onResize: function(cmp) {
        if (cmp.map) {
            cmp.map.updateSize();
            if (!cmp.initialZoom) {
                console.log('resized')
                //cmp.map.zoomToExtent(new OpenLayers.Bounds(0, 5000000, 4000000, 8000000));
                cmp.map.zoomToExtent(cmp.map.outlineExtent || new OpenLayers.Bounds(12490000, -900000, 12530000, -800000));
                //cmp.map.zoomToExtent(new OpenLayers.Bounds(675736.2753,9187051.894,704022.2164,9204621.9448))
                cmp.initialZoom = true;
            }
            
        }
    },
        
    handleMeasureModify: function(point,feature,control) {
        var geometry = feature.geometry;
        if (geometry.components[0].components) {
            geometry.components[0].addComponent(point);
        }
        else {
            geometry.addPoint(point);
        }
        OpenLayers.Control.Measure.prototype.measure.apply(control,[geometry,'measurepartial']);
    },
});


