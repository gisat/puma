Ext.define('PumaMain.controller.Export', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Ext.Ajax'],
    init: function() {
        //this.initConf();
    },

    initConf: function() {
        console.log('Init')
        var id = window.location.search.split('?')[1].split('&')[0].split('=')[1];
        this.forDownload = window.location.search.search('fordownload')>-1;
        Ext.Ajax.request({
            url: Config.url + '/api/urlview/getChart',
            params: {_id: id},
            scope: this,
            //method: 'GET',
            success: this.onConfLoaded
        })
    },
        
    onConfLoaded:function(response) {
        var cfg = JSON.parse(response.responseText).data;
        var opts = {
            height: 400,
            width: 575
        };
        if (cfg.type=='extentoutline') {
            opts.layout = 'absolute'
            var selAreas = JSON.parse(cfg.selectedAreas);
            var count = 0;
            for (var loc in selAreas) {
                for (var at in selAreas[loc]) {
                    count += selAreas[loc][at].length
                }
            }
            //opts.height = 300*Math.min(4,count)+10;
        }
        if (cfg.type=='map') {
            var size = cfg.layers2 ? {h:cfg.size.h,w:cfg.size.w*2} : {h:cfg.size.h,w:cfg.size.w}
            opts = {
                height: this.forDownload ? size.h : 800,
                width: this.forDownload ? size.w : 1150,
                items: [{xtype:'component',flex:1,margin:'0 2 0 0',first:true,id:'app-map',cls:'map'}]
            }
            if (cfg.layers2) {
                opts.items.push({xtype:'component',flex:1,id:'app-map2',cls:'map'})
                opts.layout = {
                    type: 'hbox',
                    align: 'stretch'
                }
            }
            this.mapWidth = opts.width
        }
        if (cfg.type=='extentoutline') {
            opts = {
                height: 402,
                width: 565
            }
        }
        var chart = Ext.widget('chartcmp', opts);
        
        
        chart.render('rendering');
        
        chart.cfg = Ext.clone(cfg);
        chart.cfg.areas = chart.cfg.oldAreas;
        chart.queryCfg = cfg;
        
        if (cfg.type=='map') {
            this.loadMap(chart);
            return;
        }
        
        var chartController = this.getController('Chart');
        
        var params = chartController.getParams(cfg);
        params['forExport'] = true;
        Ext.Ajax.request({
            url: Config.url + '/api/chart/getChart',
            params: params,
            singlePage: true,
            scope: chartController,
            method: 'POST',
            cmp: chart,
            success: chartController.onChartReceived,
            failure: chartController.onChartReceived
        })
    },
        
    
        
    loadMap: function(cmp) {
        
        var counterObj = {cnt: 0,desired: 0};
        var maps = [];
        var overallLayers = [];
        var me = this;
        cmp.items.each(function(item) {
            var options = {
                projection: new OpenLayers.Projection("EPSG:900913"),
                displayProjection: new OpenLayers.Projection("EPSG:4326"),
                units: "m",
                numZoomLevels: 22,
                maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
                featureEvents: true,
                allOverlays: true,
                div: item.el.dom
            };
            var map = new OpenLayers.Map(options);
            maps.push(map);
            var cfg = cmp.cfg;
            var layers = [];
            var gLayer = null;
            var legends = [];
            var cfgLayers = item.first ? cfg.layers: cfg.layers2;
            for (var i = 0; i < cfgLayers.length; i++) {
                var layerCfg = cfgLayers[i];
                var layer = null;
                var disallowedTypes = {selectedareas: 1, selectedareasfilled: 1, areaoutlines: 1}
                if (!layerCfg.sldId && !layerCfg.layersParam && !disallowedTypes[layerCfg.type]) {
                    layer = layerCfg.type == 'osm' ? new OpenLayers.Layer.OSM() : new OpenLayers.Layer.Google(
                            'Google',
                            {
                                type: layerCfg.type,
                                animationEnabled: true,
                                initialized: true,
                                visibility: true
                                        // zajimavy issues pri tisku pokud opacita neni 1
                                        //,
                                        //opacity: layerCfg.opacity
                            }

                    );
                    gLayer = layer;
                    counterObj.desired++;
                }
                else if (layerCfg.sldId || layerCfg.layersParam) {
                    var layerParams = {
                        singleTile: true,
                        visibility: true,
                        opacity: layerCfg.opacity,
                        ratio: 1.02
                    }
                    var params = {
                        transparent: true,
                        format: 'image/png'
                    }
                    if (layerCfg.layersParam) {
                        params['layers'] = layerCfg.layersParam;
                        delete layerParams.singleTile;
                        layerParams.tileSize = new OpenLayers.Size(256,256)
                        layerParams.removeBackBufferDelay = 0;
                        layerParams.transitionEffect = null;
                    }
                    if (layerCfg.sldId) {
                        params['sld_id'] = layerCfg.sldId
                    }
                    if (layerCfg.stylesParam) {
                        params['styles'] = layerCfg.stylesParam
                    }
                    if (layerCfg.legendSrc) {
                        legends.push({
                            src: layerCfg.legendSrc,
                            name: layerCfg.name
                        })
                    }
                    layer = new OpenLayers.Layer.WMS('WMS', Config.url + '/api/proxy/wms', params, layerParams);
                    counterObj.desired++;

                }
                if (layer) {

                    layers.push(layer);
                }
            }

            if (item.first && legends.length && me.forDownload) {
                var html = '';
                for (var i = 0; i < legends.length; i++) {
                    var legend = legends[i];

                    // replace protocol with no-ssl http when loading legend in Phantomjs
                    var legendSrc = legend.src;
                    if(location.protocol == "http:"){
                        legendSrc = legendSrc.replace("https://", "http://");
                        if(legendSrc != legend.src){
                            console.log("Legend src replaced:", legend.src, " -> ", legendSrc);
                        }
                    }

                    html += '<div class="legend-container"><div class="legend-text" >' + legend.name + '</div><img src="' + legendSrc + '"/></div>'
                }
                var legendEl = Ext.get('legend');
                legendEl.setStyle({maxWidth: this.mapWidth});
                legendEl.update(html);
            }
            if (cfg.layers2) {
                var blob = Ext.DomHelper.createDom({cls:"map-label",html:item.first ? cfg.yearName : cfg.year2Name});
                var yearEl = new Ext.dom.Element(blob);
                item.el.appendChild(yearEl);
            }
            layers.reverse();
            map.addLayers(layers);
            if (cfg.trafficLayer && gLayer) {
                var trafficLayer = new google.maps.TrafficLayer()
                trafficLayer.setMap(gLayer.mapObject);

            }
            overallLayers = Ext.Array.merge(overallLayers,layers);
        })
        
        
        for (var i = 0; i < overallLayers.length; i++) {
            var layer = overallLayers[i];
            if (layer.mapObject) {
                google.maps.event.addListener(layer.mapObject, 'tilesloaded', function() {
                    counterObj.cnt++;
                    if (counterObj.cnt == counterObj.desired) {
                        window.setTimeout(function() {
                            console.log('loadingdone');
                            
                            },2000)
                    }
                })
            }
            else {
                layer.events.register('loadend', null, function(a, b) {
                    counterObj.cnt++;
                    if (counterObj.cnt == counterObj.desired) {
                        window.setTimeout(function() {
                            console.log('loadingdone');
                            
                            },2000)
                    }
                });
            }
        }
        for (var i=0;i<maps.length;i++) {
            maps[i].setCenter([cmp.cfg.center.lon, cmp.cfg.center.lat], cmp.cfg.zoom);
        }
        Ext.ComponentQuery.query('chartcmp')[0].el.setStyle({backgroundColor:'#444'});

    }
});

