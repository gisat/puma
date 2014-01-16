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
            method: 'GET',
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
            opts = {
                height: cfg.size.h,
                width: cfg.size.w
            }
            this.mapWidth = cfg.size.w;
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
            method: 'GET',
            cmp: chart,
            success: chartController.onChartReceived,
            failure: chartController.onChartReceived
        })
    },
        
    
        
    loadMap: function(cmp) {
        var options = {
            projection: new OpenLayers.Projection("EPSG:900913"),
            displayProjection: new OpenLayers.Projection("EPSG:4326"),
            units: "m",
            numZoomLevels: 22,
            maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
            featureEvents: true,
            allOverlays: true,
            div: cmp.el.dom
        };
        var map = new OpenLayers.Map(options);
        
        var cfg = cmp.cfg;
        var layers = [];
        var gLayer = null;
        
        var counterObj = {cnt: 0,desired: 0};
        var legends = [];
        for (var i=0;i<cfg.layers.length;i++) {
            var layerCfg = cfg.layers[i];
            var layer = null;
            var disallowedTypes = {selectedareas:1,selectedareasfilled:1,areaoutlines:1}
            if (!layerCfg.sldId && !layerCfg.layersParam && !disallowedTypes[layerCfg.type]) {
                layer = layerCfg.type=='osm' ? new OpenLayers.Layer.OSM() : new OpenLayers.Layer.Google(
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
            else if (layerCfg.sldId || layerCfg.layersParam){
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
                    params['layers'] = layerCfg.layersParam
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
        
        if (legends.length && this.forDownload) {
            
            var html = '';
            for (var i=0;i<legends.length;i++) {
                var legend = legends[i];
                html += '<div class="legend-container"><div class="legend-text" >'+legend.name+'</div><img src="'+legend.src+'"/></div>'
            }
            var legendEl = Ext.get('legend');
            legendEl.setStyle({maxWidth:this.mapWidth});
            legendEl.update(html);
        }
        
        
        
        layers.reverse();
        map.addLayers(layers);
        if (cfg.trafficLayer&&gLayer) {
            var trafficLayer = new google.maps.TrafficLayer()
            trafficLayer.setMap(gLayer.mapObject);
            
        }
        
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (layer.mapObject) {
                google.maps.event.addListener(layer.mapObject, 'tilesloaded', function() {
                    counterObj.cnt++;
                    if (counterObj.cnt == counterObj.desired) {
                        window.setTimeout(function() {
                            console.log('loadingdone');
                            
                            },100)
                    }
                })
            }
            else {
                layer.events.register('loadend', null, function(a, b) {
                    counterObj.cnt++;
                    if (counterObj.cnt == counterObj.desired) {
                        window.setTimeout(function() {
                            console.log('loadingdone');
                            
                            },100)
                    }
                });
            }
        }
        map.setCenter([cfg.center.lon, cfg.center.lat], cfg.zoom);

    }
});

