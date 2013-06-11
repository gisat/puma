Ext.define('PumaMain.controller.Map', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control({
            '#map': {
                afterrender: this.afterRender,
                resize: this.onResize
            },
            'initialbar #zoomselectedbtn': {
                click: this.onZoomSelected
            },
            'initialbar #featureinfobtn': {
                toggle: this.onFeatureInfoActivated
            },
            'initialbar #measurelinebtn': {
                toggle: this.onMeasureActivated
            },
            'initialbar #measurepolygonbtn': {
                toggle: this.onMeasureActivated
            },
        })
    },
    onFeatureInfoActivated: function(btn,val) {
        if (val) {
            this.featureInfoControl.activate();
        }
        else {
            this.featureInfoControl.deactivate();
        }
    },
        
    onMeasureActivated: function(btn,val) {
        var control = btn.itemId == 'measurelinebtn' ? this.measureLineControl : this.measurePolyControl;
        
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
            control.activate();
        }
        else {
            if (window) {
                window.close();
            }
            control.deactivate();
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
            var area = areaController.getArea(sel[i].at,sel[i].gid);
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
    
    afterRender: function(cmp) {
        var options = {
            projection: new OpenLayers.Projection("EPSG:900913"),
            displayProjection: new OpenLayers.Projection("EPSG:4326"),
            units: "m",
            numZoomLevels: 22,
            maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
            featureEvents: true,
            allOverlays: true,
            div: 'map'
        };
        var map = new OpenLayers.Map(options);
        cmp.map = map;
        var layer = new OpenLayers.Layer.Google(
                'Google',
                {
                    type: 'hybrid',
                    animationEnabled: true
                }
        );
        map.defaultLayer = layer;
        
        var params = {
            transparent: true,
            format: 'image/png',
            layers: 'puma:layer_349',
            styles: 'Polygon'
        }
        var layerParams = {
            singleTile: true,
            visibility: true,
            ratio: 1.2,
            transitionEffect: 'resize',
            removeBackBufferDelay: 100
        }
        
        //var layer = new OpenLayers.Layer.WMS('WMS', Cnst.url+'/api/proxy/wms', params, layerParams)
        //var layer9 = new OpenLayers.Layer.WMS('WMS', 'http://192.168.2.9:8080/geoserver/puma/wms', params, layerParams)
        
        
        this.drawnLayer = new OpenLayers.Layer.Vector('',{
            style: {
                fillOpacity: 0,
                strokeWidth: 3,
                strokeColor: '#ff8800',
                strokeOpacity: 0.8,
                pointRadius: 2
            }
        })
        //bbox: 112.337169,-7.954641,112.977462,-7.029791
        map.addLayers([layer,this.drawnLayer]);
        
        map.updateSize();
        map.zoomToExtent(new OpenLayers.Bounds(-675736.2753,9187051.894,704022.2164,9204621.9448))
        
        var params = {
            transparent: true,
            format: 'image/png',
            info_format: 'application/vnd.ogc.gml'
        }
        //params.layers = 'puma:layer_260,puma:layer_266'
        

        this.selectInMapLayer = new OpenLayers.Layer.WMS('WMS', Cnst.url+'/api/proxy/wms', params, {
            visibility: true
        });
        this.selectInMapLayer.projection = map.projection;
        
        this.getFeatureInfoLayer = new OpenLayers.Layer.WMS('WMS', Cnst.url+'/api/proxy/wms', params, {
            visibility: true
        });
        this.getFeatureInfoLayer.projection = map.projection;
        
        var infoControls = {
            click: new OpenLayers.Control.WMSGetFeatureInfo({
                url: Cnst.url+'/api/proxy/wms', 
                vendorParams: {
                    propertyName: 'gid'
                },
                layers: [this.selectInMapLayer]
            }), 
            hover: new OpenLayers.Control.WMSGetFeatureInfo({
                url: Cnst.url+'/api/proxy/wms', 
                vendorParams: {
                    propertyName: 'gid',
                    buffer: 1
                },
                layers: [this.selectInMapLayer],
                hover: true
            })
        };
        this.featureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
                url: Cnst.url+'/api/proxy/wms', 
                vendorParams: {
                    propertyName: 'gid',
                    buffer: 1,
                    completeLayer: true
                },
                layers: [this.getFeatureInfoLayer]
            })
        this.drawPolygonControl = new OpenLayers.Control.DrawFeature(
            this.drawnLayer,
            OpenLayers.Handler.Polygon
        )
        this.drawPointControl = new OpenLayers.Control.DrawFeature(
            this.drawnLayer,
            OpenLayers.Handler.Point
        )
        this.selectControl = new OpenLayers.Control.SelectFeature(
            this.drawnLayer,
            {
                highlightOnly: true
            }
            
        )
        this.dragControl = new OpenLayers.Control.DragFeature(
            this.drawnLayer,{
            geometryTypes:['OpenLayers.Geometry.Point']
            }
            )
            
        
        var me = this; 
        var measureCallbacks = {
            'modify':function(point,feature) {
                me.handleMeasureModify(point,feature,this);
            }
        }
        this.measurePolyControl =  new OpenLayers.Control.Measure(
            OpenLayers.Handler.Polygon,
            {
                geodesic:true,
                persist: true,
                callbacks: measureCallbacks
            }
            );
        this.measureLineControl =  new OpenLayers.Control.Measure(
            OpenLayers.Handler.Path,
            {
                geodesic:true,
                persist: true,
                callbacks: measureCallbacks
            }
            );
        
        
        map.addControls([this.drawPolygonControl,this.drawPointControl,this.selectControl,this.dragControl,this.featureInfoControl,this.measurePolyControl,this.measureLineControl]);
        this.dragControl.activate();
        this.dragControl.onComplete = function(feature) {
            me.getController('UserPolygon').onFeatureDragged(feature);
        }
        //this.drawPolygonControl.activate();
        for (var i in infoControls) { 
            infoControls[i].events.register("getfeatureinfo", this, this.onFeatureSelected);
            map.addControl(infoControls[i]); 
        }
        this.featureInfoControl.events.register('beforegetfeatureinfo',this,function() {
            return this.updateFeatureInfoControl()
        })
        this.featureInfoControl.events.register("getfeatureinfo", this, function(response) {
            return this.onFeatureInfo(response);
        });
        this.measureLineControl.events.register('measurepartial',this,function(obj) {
            return this.onMeasurePartial(obj);
        });
        this.measurePolyControl.events.register('measurepartial',this,function(obj) {
            return this.onMeasurePartial(obj);
        });
        
        
        //infoControls.hover.activate();
        //infoControls.click.activate();
        this.infoControls = infoControls
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
        layers = layers.join(',');
        this.getFeatureInfoLayer.params['LAYERS'] = layers;
    },
    
    updateGetFeatureControl: function() {
        var layers = [];
        var controller = this.getController('Area');
        var areaTemplates = controller.areaTemplates;
        var areaTemplateMap = controller.areaTemplateMap;
        for (var i=0;i<areaTemplates.length;i++) {
            if (areaTemplates[i]==-1) {
                var location = Ext.ComponentQuery.query('initialbar #locationcontainer button[pressed=true]')[0].objId;
                var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
                var layer = 'puma:#userpolygon#layer_user_#userid#_loc_'+location+'_y_'+year;
            }
            else {
                var lr = areaTemplateMap[areaTemplates[i]];
                if (!lr) continue;
                var layer = 'puma:layer_'+lr.id;
            }
            layers.push(layer)
        }
        layers = layers.join(',');
        this.selectInMapLayer.params['LAYERS'] = layers;
    },
        
    onFeatureSelected: function(evt) {
        var features = JSON.parse(evt.text).features;
        debugger;
        if (features && features.length) {
             var controller = this.getController('Area')
             var areaTemplates = controller.areaTemplates;
             var areaTemplateMap = controller.areaTemplateMap;
             var lrs = [];
             features.reverse();
             var root = Ext.StoreMgr.lookup('area').getRootNode();
             var gid = null;
             var at = null;
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
                 var found = false;
                 root.cascadeBy(function(node) {
                    if (!node.isVisible()) return;
                    if (node.get('lr')==lr && node.get('gid')==gid) {
                        found = true;
                        at = node.get('at');
                        return false;
                    }
                 })
                 if (found) {
                     break;
                 } 
             }
             
             var selected = [];
             if (at) {
                 selected.push({at:at,gid:gid})
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
                cmp.map.zoomToExtent(new OpenLayers.Bounds(0, 5000000, 4000000, 8000000));
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


