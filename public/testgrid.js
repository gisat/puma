$(document).ready(function() {
    init();
})
var map1 = null;
function init() {
    var options = {
            projection: new OpenLayers.Projection("EPSG:3857"),
            displayProjection: new OpenLayers.Projection("EPSG:4326"),
//            units: "m",
//            numZoomLevels: 22,
//            maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
//            featureEvents: true,
//            allOverlays: true,
            layers: [
            new OpenLayers.Layer.Google(
                "Google Hybrid",
                {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
            )
            ],
            center: new OpenLayers.LonLat(106.8,11.2)
            // Google.v3 uses web mercator as projection, so we have to
            // transform our coordinates
            .transform('EPSG:4326', 'EPSG:3857'),
            zoom: 12,
            div: 'map'
        };
        map1 = new OpenLayers.Map(options);
     
        var layerParams = {
           
            visibility: true,
            opacity: 0.7,
            buffer: 0,
            //singleTile: true,
            tileSize: new OpenLayers.Size(256,256)
            //,
            //transitionEffect: 'resize',
            //removeBackBufferDelay: 100
        }
        var params = {
            transparent: true,
            tiled: true,
            layers: 'geonode:hcmc_rapideye_2010',
            format: 'image/png'
        }
        var layer1 = new OpenLayers.Layer.WMS('WMS', 'http://geonode.gisat.cz/geoserver/wms', params, layerParams);
        map1.addLayers([layer1]);
        //map1.size = map1.getCurrentSize();
        //map1.addLayers([hybridLayer]);
        //map1.updateSize();
        //map1.zoomToExtent(new OpenLayers.Bounds(12490000, -900000, 12530000, -800000));
        
}
