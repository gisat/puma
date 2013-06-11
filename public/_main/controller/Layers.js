Ext.define('PumaMain.controller.Layers', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMain.view.LayerMenu','Puma.util.Color'],
    init: function() {
        this.control({
            '#layerpanel': {
                checkchange: this.onCheckChange,
                itemcontextmenu: this.onContextMenu
            },
            '#layerpanel treeview': {
                beforedrop: this.onBeforeDrop,
                drop: this.reloadLayers
            },
            'layermenu #opacity': {
                click: this.openOpacityWindow
            },
            'slider[itemId=opacity]': {
                change: this.onOpacityChange
            }
        })
    },
        
    onOpacityChange: function(slider,value) {
        slider.layer.setOpacity(value/100);
    },
    
    openOpacityWindow: function(btn) {
        var menu = btn.up('menu')
        var window = Ext.widget('window',{
            layout: 'fit',
            title: menu.layerName,
            items: [{
                xtype: 'slider',
                itemId: 'opacity',
                layer: menu.layer,
                width: 200,
                value: menu.layer.opacity*100
                        
            }]
        })
        window.show();
    },
        
    onContextMenu: function(tree,rec,item,index,e) {
        
        e.stopEvent();
        var layer = rec.get('layer');
        var bindChart = rec.get('bindChart')
        if (!layer && (!bindChart || !bindChart.currentMapParams)) {
            return;
        }
        if (bindChart) {
            var params = bindChart.currentMapParams;
            if (params['showChoropleth']) {
                var idx = params['mapAttributeIndex'];
                var attrLength = JSON.parse(params['attrs']).length;
                if (idx + 1 == attrLength) {
                    params['mapAttributeIndex'] = 0;
                }
                else {
                    params['mapAttributeIndex']++;
                }

                this.onChartReconfigure(bindChart, params);
                return;
            }

        }
        
        var layerMenu = Ext.widget('layermenu',{
            layer: layer,
            layerName: rec.get('name')
        })
        layerMenu.showAt(e.getXY());
        
    },
    
    colourMap: function(selectMap) {
        var store = Ext.StoreMgr.lookup('layers');
        var node = store.getRootNode().findChild('layerName','areaoutline',true);
        if (!node) return;
        var layer = node.get('layer');
        var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
        var location = Ext.ComponentQuery.query('initialbar #locationcontainer button[pressed=true]')[0].objId;
        var areaTemplates = this.getController('Area').areaTemplateMap;
        var namedLayers = [];
        
        selectMap = selectMap || {};
        var empty = true;
        for (var at in selectMap) {
            var lr = areaTemplates[at];
            if (!lr && at!=-1) continue;
            empty = false;
            var style = new OpenLayers.Style();
            var layerId = at==-1 ? '#userlocation#_y_'+year : lr._id;
            var layerName = 'puma:layer_' + layerId
            //var layerName = lr.layer;

            var defRule = new OpenLayers.Rule({
                symbolizer: {"Polygon": new OpenLayers.Symbolizer.Polygon({fillOpacity: 0, strokeOpacity: 0})}
            });
            style.addRules([defRule]);
            
            var recode = ['${gid}'];
            var filters = [];
            for (var gid in selectMap[at]) {
                var filter = new OpenLayers.Filter.Comparison({type:'==',property:'gid',value:gid});
                filters.push(filter);             
                var color = '#'+selectMap[at][gid];
                recode.push(gid);
                recode.push(color);
            }
            var recodeFc = new OpenLayers.Filter.Function({name:'Recode',params:recode});
            var filterFc = new OpenLayers.Filter.Logical({type:'||',filters:filters});
            
            
            var obj = {
                filter: filterFc,
                symbolizer: {"Polygon": new OpenLayers.Symbolizer.Polygon({strokeColor: recodeFc, strokeWidth: 1, fillOpacity: 0})}
            }
            if (location!=922) {
                obj.maxScaleDenominator= 5000000
            }
            var rule1 = new OpenLayers.Rule({
                filter: filterFc,
                minScaleDenominator: 5000000,
                symbolizer: {"Point": new OpenLayers.Symbolizer.Point({strokeColor: '#888888', strokeWidth: 1, graphicName: 'circle', pointRadius: 8, fillColor: recodeFc})}
            });
            var rule2 = new OpenLayers.Rule(obj);
            style.addRules(location!=922 ? [rule1, rule2] : [rule2]);
            namedLayers.push({
                name: layerName,
                userStyles: [style]
            })
            
        }
        if (empty) {
            layer.setVisibility(false);
            node.set('initialized',false);
            return;
        }
        var sldObject = {
            name: 'style',
            title: 'Style',
            namedLayers: namedLayers
        }
        console.log(namedLayers);
        var format = new OpenLayers.Format.SLD.Geoserver23();
        var sldNode = format.write(sldObject);
        console.log(sldNode);
        var xmlFormat = new OpenLayers.Format.XML();
        var sldText = xmlFormat.write(sldNode);
        
        
        Ext.Ajax.request({
            url: Cnst.url+'/api/proxy/saveSld',
            params: {
                sldBody: sldText
            },
            success: function(response) {
                var response = JSON.parse(response.responseText);
                var id = response.data;
                layer.mergeNewParams({
                    "SLD_ID": id
                })

                node.set('initialized', true);
                if (node.get('checked')) {
                    layer.setVisibility(true);
                }

            }
        })



    },
    
  
    
    onBeforeDrop: function(htmlNode,data,toNode,position) {
        var fromNodes = data.records;
        var toDepth = toNode.get('depth');
        for (var i=0;i<fromNodes.length;i++) {
            var fromNode = fromNodes[i];
            var fromDepth = fromNode.get('depth');
            if (position=='append' && fromDepth != toDepth+1) {
                return false;
            }
            if (position!='append' && fromDepth!=toDepth) {
                return false;
            }
        }
        
    },
    
    reconfigureLayers: function() {
        var store = Ext.StoreMgr.lookup('layers');
        var root = store.getRootNode();
        var layerRefMap = this.getController('Area').areaTemplateMap;
        var year = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0].objId;
        var location = Ext.ComponentQuery.query('initialbar #locationcontainer button[pressed=true]')[0].objId;
        var userId = Cnst.auth ? Cnst.auth.userId : null;
        root.cascadeBy(function(node) {
            var at = node.get('at');
            var layerName = node.get('layerName');
            if (!layerName || !at) return;
            var layer = node.get('layer');
            var layerRef = layerRefMap[at];
            if (!layerRef && at!=-1) {
                node.set('initialized',false);
                node.set('layerName','$blank$');
                layer.setVisibility(false);
                return;
            }
            node.set('initialized',true);
            var layerName = (layerRef ? layerRef.layer : node.get('layerName')) || layerRef.wmsLayers;
            node.set('layerName',layerName);
            if (layerRef && layerRef.wmsAddress) {
                node.set('wmsAddress',layerRef.wmsAddress);
                if (layer.url!=layerRef.wmsAddress) {
                    layer.setUrl(layerRef.wmsAddress)
                }
                    
            }
            else {
                node.set('wmsAddress',null);
                if (layer.url!=Cnst.url+'/api/proxy/wms') {
                    layer.setUrl(Cnst.url+'/api/proxy/wms')
                }
                
            }
            var newLayers = node.get('layerName')
            if (newLayers != layer.params['LAYERS']) {
                layer.mergeNewParams({
                    layers: newLayers
                })
            }
            layer.setVisibility(node.get('checked'))
        })
    },
        
    
    getSymObj: function(params) {
        var namedLayers = [];
        var layerName = 'puma:layer_#layerref#'
        
            
        
        var symbolizer = null;
        if (params['showChoropleth']) {
            var style = new OpenLayers.Style();
            symbolizer = {};
            var normalization = params['normalization'];
            var classConfig = JSON.parse(params['classConfig'])
            var colors = [];
            var thresholds = [];
            for (var i=0;i<classConfig.length;i++) {
                colors.push(classConfig[i].color)
                thresholds.push(classConfig[i].threshold)
            }
            var colorRange = null;
            if (params['useAttributeColors']) {
                var attrStore = Ext.StoreMgr.lookup('attribute');
                var attrs = JSON.parse(params['attrs']);
                var attrId = attrs[params['mapAttributeIndex'] || 0].attr;
                var baseColor = attrStore.getById(attrId).get('color');
                colorRange = Puma.util.Color.determineColorRange(baseColor);
            }
            
            
            var props = '';
            var filtersNull =[];
            var filtersNotNull = [];
            if (normalization && normalization!='none') {
                var normAttr = normalization == 'area' ? 'area' : '';
                normAttr = normalization == 'attributeset' ? ('as_'+params['normalizationAttributeSet']+'_attr_#attrid#') : normAttr;
                normAttr = normalization == 'attribute' ? ('as_'+params['normalizationAttributeSet']+'_attr_'+params['normalizationAttribute']) : normAttr;
                normAttr = normalization == 'toptree' ? '#toptree#' : normAttr;
                
                if (normalization!='toptree') {
                    filtersNull.push(new OpenLayers.Filter.Comparison({type:'==',property:normAttr,value:0}))
                    filtersNotNull.push(new OpenLayers.Filter.Comparison({type:'!=',property:normAttr,value:0}))
                    normAttr = '${'+normAttr+'}';
                }
                props = new OpenLayers.Filter.Function({name:'Mul',params:[new OpenLayers.Filter.Function({name:'Div',params:['${#attr#}',normAttr]}),100]});
                
                
            }
            else {
                props = '${#attr#}';
            }
            if (params['zeroesAsNull']) {
                filtersNull.push(new OpenLayers.Filter.Comparison({type:'==',property:'#attr#',value:0}))
                filtersNotNull.push(new OpenLayers.Filter.Comparison({type:'!=',property:'#attr#',value:0}))
            }
        
            var fcParams = [props];
            var numCat = params['numCategories']
            for (var i=0;i<numCat;i++) {
                var ratio = i/(numCat-1);
                var color = colorRange ? Puma.util.Color.determineColorFromRange(colorRange[0],colorRange[1],ratio) : colors[i];
                if (params['classType']=='continuous') {
                    fcParams.push('#minmax_'+(i+1)+'#');
                    fcParams.push(color);
                }
                else {
                    fcParams.push(color);
                    if (i==numCat-1) continue;
                    var val = params['classType'] == 'range' ? thresholds[i] : ('#val_'+(i+1)+'#');
                    fcParams.push(val);
                }
            }
            if (params['classType']=='continuous') {
                    fcParams.push('color');
                }
            var fcName = params['classType']=='continuous' ? 'Interpolate' : 'Categorize';
            var fillColor = new OpenLayers.Filter.Function({name:fcName,params:fcParams});
            
            symbolizer['Polygon'] = new OpenLayers.Symbolizer.Polygon({fillColor: fillColor,strokeColor:'#000000',strokeWidth:1});    
            var rule1 = new OpenLayers.Rule({
                filter: filtersNotNull.length>1 ? new OpenLayers.Filter.Logical({type:'&&',filters:filtersNotNull}) : filtersNotNull[0],
                symbolizer: symbolizer
            });
            
            var nullColor = params['nullColor'] || '#bbbbbb';
            var nullSymbolizer = {
                'Polygon': new OpenLayers.Symbolizer.Polygon({fillColor: nullColor,strokeColor:'#000000',strokeWidth:1})    
            }
            var rule2 = new OpenLayers.Rule({
                filter: filtersNull.length>1 ? new OpenLayers.Filter.Logical({type:'||',filters:filtersNull}) : filtersNull[0],
                symbolizer: nullSymbolizer
            });
            
            style.addRules(filtersNull.length ? [rule1,rule2] : [rule1]);
            namedLayers.push({
                name: layerName,
                userStyles: [style]
            })
        }
        if (params['showMapChart']) {
            var style = new OpenLayers.Style();
            symbolizer = {};
            var max = new OpenLayers.Filter.Function({name:'env',params:['maxsize']})
            var min = new OpenLayers.Filter.Function({name:'Div',params:[max,20]});       
            var sizeRange = new OpenLayers.Filter.Function({name:'Sub',params:[max,min]});
            var valRange = new OpenLayers.Filter.Function({name:'Sub',params:['#maxval#','#minval#']})
            var valFactor = new OpenLayers.Filter.Function({name:'Sub',params:['${#attr#}','#minval#']})
            
            var factor = new OpenLayers.Filter.Function({name:'Div',params:[valFactor,valRange]});
            var sizeAdd = new OpenLayers.Filter.Function({name:'Mul',params:[sizeRange,factor]});
            var size = new OpenLayers.Filter.Function({name:'Add',params:[min,sizeAdd]});
            var sizeSqrt = new OpenLayers.Filter.Function({name:'pow',params:[size,0.5]})
            
            var url = Cnst.url+'/api/chart/drawChart/#url#';
            symbolizer['Point'] = new OpenLayers.Symbolizer.Point({externalGraphic:url,graphicFormat:'image/svg+xml',graphicWidth:sizeSqrt});
            var rule1 = new OpenLayers.Rule({
                symbolizer: symbolizer
            });
            style.addRules([rule1]);
            namedLayers.push({
                name: layerName,
                userStyles: [style]
            })
            
        }
        
        
        var sldObject = {
            name: 'style',
            title: 'Style',
            namedLayers: namedLayers
        }
        var format = new OpenLayers.Format.SLD.Geoserver23();
        var sldNode = format.write(sldObject);
        var xmlFormat = new OpenLayers.Format.XML();
        var sldText = xmlFormat.write(sldNode);
        return sldText;
    },
        
    onChartReconfigure: function(chartCmp,params) {
       
        
        params = Ext.clone(params);
        var root = Ext.StoreMgr.lookup('layers').getRootNode();
        var me = this;
        root.cascadeBy(function(node) {
            if (!node.get('bindAt'))
                return;
            var at = node.get('bindAt');
            if (!at)
                return;
            if ((!params['showChoropleth'] && (!params['showMapChart'] || params['type'] != 'piechart')) || params['removing']) {
                for (var i = 0; i < node.childNodes.length; i++) {
                    var childNode = node.childNodes[i];
                    var chart = childNode.get('bindChart');
                    if (chartCmp == chart) {
                        var checked = childNode.get('checked')
                        
                        node.removeChild(childNode)
                        if (checked) {
                            node.childNodes[0].set('checked',true);
                            me.onCheckChange(node.childNodes[0],true);
                        }
                    }
                    
                }            
                return;
            }
            // !modifies also params object
            var sldText = me.getSymObj(params);
            var location = Ext.Ajax.extraParams ? Ext.Ajax.extraParams['location']:null;
            var areas = {};
            areas[location] = {};
            areas[location][at] = true;
            params['areas'] = JSON.stringify(areas);
            params['sldBody'] = sldText;
            chartCmp.currentMapParams = params;
            Ext.Ajax.request({
                url: Cnst.url+'/api/proxy/saveSld',
                layer: node.get('layer'),
                node: node,
                params: params,
                success: function(response) {
                    var data = JSON.parse(response.responseText).data;
                    var layer = response.request.options.layer;
                    var node = response.request.options.node;
                    var symbologyNode = null;
                    for (var i=0;i<node.childNodes.length;i++) {
                        var childNode = node.childNodes[i];
                        var chart = childNode.get('bindChart');
                        if (chartCmp == chart) {
                            symbologyNode = childNode;
                            break;
                        }
                    }
                    if (!symbologyNode) {
                        symbologyNode = Ext.create('Puma.model.MapLayer',{
                            name: params['title'],
                            allowDrag: false,
                            checked: false,
                            bindChart: chartCmp,
                            leaf: true
                        })
                        node.appendChild(symbologyNode);
                    }
                    symbologyNode.set('sldId',data);
                    //if (symbologyNode.get('checked')) {
                    symbologyNode.set('checked',true)
                    me.onCheckChange(symbologyNode,true);
                    //}
                }
            })
        });
        
        
    },
    reinitializeLayers: function(layersConf) {
        var store = Ext.StoreMgr.lookup('layers');
        var root = store.getRootNode();
        root.removeAll();
        var layersToAdd = [];
        for (var i = 0; i < layersConf.length; i++) {
            var group = layersConf[i];
            for (var j = 0; j < group.children.length; j++) {
                var layerConf = group.children[j];
                if (Ext.Array.contains(['hybrid', 'roadmap', 'terrain'], layerConf.layerName)) {
                    var layer = new OpenLayers.Layer.Google('Google', {
                        type: layerConf.layerName,
                        visibility: layerConf.checked,
                        animationEnabled: true
                    }
                    );
                }
                else if (layerConf.layerName=='userpolygon') {
                    var layer = this.getController('Map').drawnLayer;
                    layer.setVisibility(layerConf.checked)
                }
                else {
                    var params = {
                        transparent: true,
                        format: 'image/png'
                    } 
                    var layerParams = {
                        singleTile: true,
                        visibility: layerConf.initialized && layerConf.checked,
                        opacity: layerConf.layerName=='areaoutline' ? 1 : 0.7,
                        ratio: 1.2,
                        transitionEffect: 'resize',
                        removeBackBufferDelay: 100
                    }
                    if (layerConf.layerName!='areaoutline') {
                        params.layers = layerConf.layerName;
                    }
                    
                    
                    params.styles = layerConf.symbology ? layerConf.symbology.replace('$blank$','') : '';
                    
                    var address = layerConf.wmsAddress || Cnst.url+'/api/proxy/wms'
                    var layer = new OpenLayers.Layer.WMS('WMS', address, params, layerParams)
                    //var layer = new OpenLayers.Layer.WMS('WMS', 'http://192.168.2.9:8080/geoserver/puma/wms', params, layerParams)
                }
                layersToAdd.push(layer);
                layerConf.layer = layer;
            }
            //group.children.reverse();
        }
        layersConf.reverse();
        root.appendChild(layersConf);
        this.reloadLayers();
    },
    
    onAreasChange: function(conf) {

      
    },
        
    reloadLayers: function() {
       var layersReferenced = [];
       var map = Ext.ComponentQuery.query('#map')[0].map;
       var store = Ext.StoreMgr.lookup('layers');
       var groups = store.getRootNode().childNodes
       var cnt = 1;
       for (var i=groups.length-1;i>=0;i--) {
           var group = groups[i];
           var layerNodes = group.childNodes;
           for (var j=layerNodes.length-1;j>=0;j--) {
               var layerNode = layerNodes[j];
               var layer = layerNode.get('layer');
               if (!layer.map) {
                   map.addLayer(layer);
               }
               map.setLayerIndex(layer,cnt);
               layersReferenced.push(layer);
               cnt++;
               
           }
       }
       var mapLayers = map.layers.concat([]);
       for (var i=0;i<mapLayers.length;i++) {
           var layer = mapLayers[i];
           if (!Ext.Array.contains(layersReferenced,layer)) {
               map.removeLayer(layer);
           }
       }
       
       
    },
    
    onCheckChange: function(node,checked,performUncheck){
        var layerPanel = Ext.ComponentQuery.query('#layerpanel')[0];
        var parent = node.parentNode;
        if (performUncheck!==true && (parent.get('allowOnlyOne') || node.get('symbologyId') || node.get('sldId'))) {
            var parent = node.parentNode;
            var siblings = parent.childNodes;
            if (!checked) {
                layerPanel.suspendEvents();
                node.set('checked',true);
                layerPanel.resumeEvents();
                return;
            }
            
            for (var i=0;i<siblings.length;i++) {
                var sibling = siblings[i];
                if (sibling==node) continue;
                sibling.set('checked',false);
                this.onCheckChange(sibling,false,true);
            }
        }
    
        if (checked && node.get('symbologyId')) {
            var layer = parent.get('layer');
            layer.mergeNewParams({
                styles: node.get('symbologyId').replace('$blank$','') || '',
                "SLD_ID": null
            })
        }
        if (checked && node.get('sldId')) {
            var layer = parent.get('layer');
            layer.mergeNewParams({
                styles: null,
                "SLD_ID": node.get('sldId')
            })
        }
        var layerName = node.get('layerName')
        var hasSymbologies = node.childNodes.length>0;
        if (layerName && node.get('initialized')) {
            node.get('layer').setVisibility(checked);
        }
    },
        
    gatherSymbologiesAndOpacities: function() {
         var store = Ext.StoreMgr.lookup('layers');
        var root = store.getRootNode();
        var atMap = {};
        var hideBoundLayers = true;
        root.cascadeBy(function(node) {
            var at = node.get('at');
            var layerName = node.get('layerName');
            if (!layerName || !at) return;
            var layer = node.get('layer');
            var opacity = layer.opacity;
            var style = layer.params['STYLES'];
            var visibility = node.get('checked');
            var bindAt = node.get('bindAt');
            
            atMap[at] = {opacity:opacity,style:style}
            if (bindAt) {
                if (visibility) {
                    hideBoundLayers = false;
                }
            } 
            else {
                atMap[at].visibility = visibility;
            }
            
        })
        atMap.hideBoundLayers = hideBoundLayers;
        return atMap;
    },
        
    checkVisibilityAndStyles: function(preserveStyles,preserveVis) {
        var visBtn = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[pressed=true]')[0]
        var treeBtn = Ext.ComponentQuery.query('initialbar #treecontainer button[pressed=true]')[0]
        if (!visBtn || !treeBtn) return;
        var vis = Ext.StoreMgr.lookup('visualization').getById(visBtn.objId);
        var atMap = vis ? (vis.get('atMap') || {}) : {};
        var activeAt = treeBtn.objId;
        if (treeBtn.isTree) {
            var lowestMap = this.getController('Area').lowestMap;
            for (var key in lowestMap) {
                activeAt = key;
                break;
            }
        }
    
        var store = Ext.StoreMgr.lookup('layers');
        var root = store.getRootNode();
        var me = this;
        root.cascadeBy(function(node) {
            var at = node.get('at');
            var layerName = node.get('layerName');
            if (!layerName || !at) return;
            
            var obj = atMap[at];
            var layer = node.get('layer');
            
            if (obj && !preserveStyles) {
                layer.setOpacity(obj.opacity);
            }
        
            var bindAt = node.get('bindAt');
            var changeVisibility = null;
            if (bindAt && !atMap.hideBoundLayers && !preserveVis) {
                changeVisibility = activeAt == bindAt;
            } 
            if (bindAt && atMap.hideBoundLayers && !preserveVis) {
                changeVisibility = false;
            }
            if (obj && obj.visibility!=null && !preserveStyles) {
                changeVisibility = obj.visibility;
            }
            if (changeVisibility===false) {
                node.set('checked',false)
                layer.setVisibility(false)
            }       
            if (obj && obj.style && !preserveStyles) {
                var childNodes = node.childNodes;
                for (var i=0;i<childNodes.length;i++) {
                    var childNode = childNodes[i];
                    if (childNode.get('symbologyId') == obj.style && !childNode.get('checked')) {
                        childNode.set('checked',true)
                        me.onCheckChange(childNode,true,false)
                        break;
                    }
                }
            }       
            if (changeVisibility===true) {
                node.set('checked',true);
                if (node.get('initialized')) {
                    layer.setVisibility(true);
                }
                    
            }
            
            
        })
        
        
        
        
    }
});


