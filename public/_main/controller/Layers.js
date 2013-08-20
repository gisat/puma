Ext.define('PumaMain.controller.Layers', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMain.view.LayerMenu', 'Puma.util.Color'],
    init: function() {
        this.control({
            '#layerpanel': {
                checkchange: this.onCheckChange,
                itemclick: this.onLayerClick,
            },
            'layerpanel' : {
                choroplethreconfigure: this.onChoroplethReconfigureBtnClick,
                choroplethremove: this.onChoroplethRemove
            },
//            'layermenu #opacity': {
//                click: this.openOpacityWindow
//            },
            'slider[itemId=opacity]': {
                change: this.onOpacityChange
            },
            '#layerselectedpanel gridview': {
                drop: this.onLayerDrop,
                beforedrop: this.onBeforeLayerDrop
            },
            'choroplethpanel #numCategories': {
                change: this.onNumCategoriesChange
            },
            'choroplethpanel #classType': {
                change: this.onClassTypeChange
            },
            'choroplethpanel #useAttributeColors': {
                change: this.onUseAttrColorsChange
            },
            'choroplethpanel #fillbtn': {
                click: this.onFillColors
            },
            'choroplethpanel #addbtn': {
                click: this.onChoroplethAdd
            },
           
            'choroplethpanel #reconfigurebtn': {
                click: this.onChoroplethReconfigure
            },
            
        })
    },
        
   
        
    onFillColors: function(btn) {
        var store = btn.up('grid').store;
        var count = store.getCount();
        if (count < 3)
            return;
        try {
            var first = store.getAt(0).get('color');
            var last = store.getAt(count - 1).get('color');
        }
        catch (e) {
            return;
        }
        for (var i = 1; i < count - 1; i++) {
            var ratio = i / (count - 1);
            var rec = store.getAt(i);
            var color = Puma.util.Color.determineColorFromRange(first, last, ratio);
            rec.set('color', color);
        }
    },
    onClassTypeChange: function(combo, val) {
        var grid = Ext.ComponentQuery.query('choroplethpanel #classgrid')[0];
        grid.columns[2].setVisible(val == 'range');
    },
    onUseAttrColorsChange: function(chb, val) {
        var grid = Ext.ComponentQuery.query('choroplethpanel #classgrid')[0]
        grid.columns[1].setVisible(val ? false : true)
    },
    onNumCategoriesChange: function(combo, val) {
        var store = Ext.ComponentQuery.query('choroplethpanel #classgrid')[0].store;
        var count = store.getCount();
        if (val > count) {
            var data = [];
            for (var i = count; i < val; i++) {
                data.push({idx: i + 1})
            }
            store.loadData(data, true);
        }
        if (val < count) {
            store.removeAt(val, count - val);
        }

    },
    
    onBeforeLayerDrop: function(row,obj,dropPos) {
        var type = obj.records[0].get('type');
        if (!Ext.Array.contains(['topiclayer','chartlayer','areaoutlines','selectedareas'],type)) {
            return false;
        }
        else if (!Ext.Array.contains(['topiclayer','chartlayer','areaoutlines','selectedareas'],dropPos.get('type'))) {
            return false;
        }
    },
    onLayerDrop: function() {
        var layers = Ext.StoreMgr.lookup('selectedlayers').getRange();
        var map1 = Ext.ComponentQuery.query('#map')[0].map;
        var map2 = Ext.ComponentQuery.query('#map2')[0].map;
        layers.reverse();
        var layers1 = [];
        var layers2 = [];
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].get('layer1')) {
                layers1.push(layers[i].get('layer1'))
            }
            if (layers[i].get('layer2')) {
                layers2.push(layers[i].get('layer2'))
            }
        }
//        if (map1) {
//            map1.layers = layers1;
//            map1.resetLayersZIndex();
//        }
//        if (map2) {
//            map2.layers = layers1;
//            map2.resetLayersZIndex();
//        }
        
        for (var i = 0; i < layers.length; i++) {
            if (map1 && layers1[i]) {
                if (i==0) {
                    map1.setBaseLayer(layers1[i]);
                }
                map1.setLayerIndex(layers1[i],i);
            }
            if (map2 && layers2[i]) {
                if (i==0) {
                    map2.setBaseLayer(layers2[i]);
                }
                map2.setLayerIndex(layers2[i],i);
            }
        }
    },
    onOpacityChange: function(slider, value) {
        slider.layer1.setOpacity(value / 100);
        if (slider.layer2) {
            slider.layer2.setOpacity(value / 100);
        }
    },
    openOpacityWindow: function(btn) {
        var menu = btn.up('menu')
        var window = Ext.widget('window', {
            layout: 'fit',
            title: menu.layerName,
            items: [{
                    xtype: 'slider',
                    itemId: 'opacity',
                    layer1: menu.layer1,
                    layer2: menu.layer2,
                    width: 200,
                    value: menu.layer1.opacity * 100

                }]
        })
        window.show();
    },
    onLayerContextMenu: function(tree, rec, item, index, e) {
       
        var bindChart = rec.get('bindChart');
        if (!bindChart || rec.get('type')!='chart') {
            return;
        }
         e.stopEvent();
        var layerMenu = Ext.widget('layermenu', {
            bindChart: bindChart
        })
        layerMenu.showAt(e.getXY());
        
    },
    onContextMenu: function(tree, rec, item, index, e) {

        e.stopEvent();
        
        var layerMenu = Ext.widget('layermenu', {
            layer1: rec.get('layer1'),
            layer2: rec.get('layer2'),
            layerName: rec.get('name')
        })
        layerMenu.showAt(e.getXY());

    },
    colourMap: function(selectMap, map1NoChange, map2NoChange) {
        var store = Ext.StoreMgr.lookup('layers');
        var node = store.getRootNode().findChild('type', 'selectedareas', true);
        if (!node)
            return;
        var layer1 = node.get('layer1');
        var layer2 = node.get('layer2');

        var years = Ext.ComponentQuery.query('#selyear')[0].getValue()
        var areaTemplates = this.getController('Area').areaTemplateMap;
        var namedLayers1 = [];
        var namedLayers2 = [];
        selectMap = selectMap || {};

        for (var loc in selectMap) {

            for (var at in selectMap[loc]) {

                for (var i = 0; i < Math.max(2, years.length); i++) {
                    if (i == 0 && map1NoChange)
                        continue;
                    if (i == 1 && map2NoChange)
                        continue;
                    var lr = (areaTemplates[loc] && areaTemplates[loc][at]) ? areaTemplates[loc][at][years[i]] : null;
                    if (!lr && at != -1)
                        continue;
                    var style = new OpenLayers.Style();
                    //var layerId = at == -1 ? '#userlocation#_y_' + year : lr._id;
                    var layerId = lr._id;
                    var layerName = 'puma:layer_' + layerId

                    var defRule = new OpenLayers.Rule({
                        symbolizer: {"Polygon": new OpenLayers.Symbolizer.Polygon({fillOpacity: 0, strokeOpacity: 0})}
                    });
                    style.addRules([defRule]);

                    var recode = ['${gid}'];
                    var filters = [];
                    for (var gid in selectMap[loc][at]) {
                        var filter = new OpenLayers.Filter.Comparison({type: '==', property: 'gid', value: gid});
                        filters.push(filter);
                        var color = '#' + selectMap[loc][at][gid];
                        recode.push(gid);
                        recode.push(color);
                    }
                    var recodeFc = new OpenLayers.Filter.Function({name: 'Recode', params: recode});
                    var filterFc = new OpenLayers.Filter.Logical({type: '||', filters: filters});


                    var obj = {
                        filter: filterFc,
                        symbolizer: {"Polygon": new OpenLayers.Symbolizer.Polygon({strokeColor: recodeFc, strokeWidth: 1, fillOpacity: 0})}
                    }
                    var rule1 = new OpenLayers.Rule({
                        filter: filterFc,
                        minScaleDenominator: 5000000,
                        symbolizer: {"Point": new OpenLayers.Symbolizer.Point({strokeColor: '#888888', strokeWidth: 1, graphicName: 'circle', pointRadius: 8, fillColor: recodeFc})}
                    });
                    var rule2 = new OpenLayers.Rule(obj);
                    style.addRules([rule1, rule2]);
                    var namedLayers = i == 0 ? namedLayers1 : namedLayers2;
                    namedLayers.push({
                        name: layerName,
                        userStyles: [style]
                    })
                }
            }

        }


        var namedLayersGroup = [namedLayers1, namedLayers2];
        for (var i = 0; i < namedLayersGroup.length; i++) {
            var namedLayer = namedLayersGroup[i];
            var layer = i == 0 ? layer1 : layer2;
            var change = i == 0 ? map1NoChange : map2NoChange;
            if (!namedLayer.length) {
                if (!change) {
                    layer.setVisibility(false);
                    layer.initialized = false;
                }

                continue;
            }
            this.saveSld(node, namedLayer, layer);
        }
    },
    saveSld: function(node, namedLayers, layer, params, legendNamedLayers) {
        var sldObject = {
            name: 'style',
            title: 'Style',
            namedLayers: namedLayers
        }
        
        var format = new OpenLayers.Format.SLD.Geoserver23();
        var xmlFormat = new OpenLayers.Format.XML();
        var sldNode = format.write(sldObject);
        var sldText = xmlFormat.write(sldNode);
        var legendSld =  null;
        if (legendNamedLayers) {
            var legendSldObject = {
                name: 'style',
                title: 'Style',
                namedLayers: legendNamedLayers
            }
            var legendSldNode = format.write(legendSldObject);
            legendSld = xmlFormat.write(legendSldNode);
        }
        var me = this;
        
        Ext.Ajax.request({
            url: Config.url + '/api/proxy/saveSld',
            params: Ext.apply({
                sldBody: sldText,
                legendSld: legendSld || ''
            }, params || {}),
            layer: layer,
            node: node,
            legendLayer: legendNamedLayers && legendNamedLayers.length ? legendNamedLayers[0].name : null,
            success: function(response) {
                var layer = response.request.options.layer;
                var node = response.request.options.node;
                var legendLayer = response.request.options.legendLayer;
                response = JSON.parse(response.responseText);
                var id = response.data;
                layer.mergeNewParams({
                    "SLD_ID": id
                })
                layer.initialized = true;
                if (legendLayer) {
                    node.set('src',me.getLegendUrl(id,legendLayer))
                    
                }
                if (node.get('checked')) {
                    layer.setVisibility(true);
                    //Ext.ComponentQuery.query('#legendpanel')[0].refresh();
                }
                
            },
            failure: function(response) {
                var layer = response.request.options.layer;
                layer.initialized = false;
                layer.setVisibility(false);
            }
        })
    },
    refreshOutlines: function() {
        var store = Ext.StoreMgr.lookup('layers');
        var node = store.getRootNode().findChild('type', 'areaoutlines', true);
        if (!node)
            return;
        var layer1 = node.get('layer1');
        var layer2 = node.get('layer2');

        var years = Ext.ComponentQuery.query('#selyear')[0].getValue()
        for (var i = 0; i < Math.max(2, years.length); i++) {
            var year = years[i];
            var filterMap = this.getTreeFilters(year);
            var namedLayers = [];

            for (var layerName in filterMap) {
                var style = new OpenLayers.Style();
                var obj = {
                    filter: filterMap[layerName],
                    symbolizer: {"Polygon": new OpenLayers.Symbolizer.Polygon({strokeColor: '#333333', strokeWidth: 2, fillOpacity: 0.1})}
                }
                var rule1 = new OpenLayers.Rule(obj);
                style.addRules([rule1]);
                namedLayers.push({
                    name: layerName,
                    userStyles: [style]
                })
            }
            if (!namedLayers.length) {
                continue;
            }
            var layer = i == 0 ? layer1 : layer2;
            this.saveSld(node, namedLayers, layer);
        }

    },
    getTreeFilters: function(year) {
        var allAreas = this.getController('Area').lastMap;
        var areaTemplates = this.getController('Area').areaTemplateMap;
        var filterMap = {};
        for (var loc in allAreas) {
            for (var at in allAreas[loc]) {
                var lr = (areaTemplates[loc] && areaTemplates[loc][at]) ? areaTemplates[loc][at][year] : null;
                if (!lr || !allAreas[loc][at].length)
                    continue;
                var layerName = 'puma:layer_' + lr._id
                var filters = [];
                for (var i = 0; i < allAreas[loc][at].length; i++) {
                    var gid = allAreas[loc][at][i];
                    var filter = new OpenLayers.Filter.Comparison({type: '==', property: 'gid', value: gid});
                    filters.push(filter);
                }
                if (filters.length == 0)
                    continue;
                var filterFc = filters.length > 1 ? new OpenLayers.Filter.Logical({type: '||', filters: filters}) : filters[0];
                filterMap[layerName] = filterFc;
            }
        }
        return filterMap;
    },
    getSymObj: function(params) {

        var legendRules = [];
        var symbolizer = null;
        if (true) {
            symbolizer = {};
            var normalization = params['normalization'];
            var classConfig = JSON.parse(params['classConfig'])
            var colors = [];
            var thresholds = [];
            for (var i = 0; i < classConfig.length; i++) {
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
            var filtersNull = [];
            var filtersNotNull = [];
            if (normalization && normalization != 'none' && normalization != 'year') {
                var normAttr = normalization == 'area' ? 'area' : '';
                normAttr = normalization == 'attributeset' ? ('as_' + params['normalizationAttributeSet'] + '_attr_#attrid#') : normAttr;
                normAttr = normalization == 'attribute' ? ('as_' + params['normalizationAttributeSet'] + '_attr_' + params['normalizationAttribute']) : normAttr;
                normAttr = normalization == 'toptree' ? '#toptree#' : normAttr;

                if (normalization != 'toptree') {
                    filtersNull.push(new OpenLayers.Filter.Comparison({type: '==', property: normAttr, value: 0}))
                    filtersNotNull.push(new OpenLayers.Filter.Comparison({type: '!=', property: normAttr, value: 0}))
                    normAttr = '${' + normAttr + '}';
                }
                props = new OpenLayers.Filter.Function({name: 'Mul', params: [new OpenLayers.Filter.Function({name: 'Div', params: ['${#attr#}', normAttr]}), 100]});
            }
            else {
                props = '${#attr#}';
            }
            if (params['zeroesAsNull']) {
                filtersNull.push(new OpenLayers.Filter.Comparison({type: '==', property: '#attr#', value: 0}))
                filtersNotNull.push(new OpenLayers.Filter.Comparison({type: '!=', property: '#attr#', value: 0}))
            }
                //var nullFilter = new OpenLayers.Filter.Function({name: 'isNull',params: ['${#attr#}']})
                //filtersNull.push(new OpenLayers.Filter.Comparison({type: '==', property: nullFilter, value: 'true'}));
            var nullFilter = new OpenLayers.Filter.Comparison({type:'NULL',property:'#attr#'})
            filtersNotNull.push(new OpenLayers.Filter.Logical({type: '!', filters:[nullFilter]}))
            filtersNull.push(nullFilter)

            var fcParams = [props];
            var numCat = params['numCategories']
            for (var i = 0; i < numCat; i++) {
                var ratio = i / (numCat - 1);
                var legendName ='';
                var color = colorRange ? Puma.util.Color.determineColorFromRange(colorRange[0], colorRange[1], ratio) : colors[i];
                if (params['classType'] == 'continuous') {
                    fcParams.push('#minmax_' + (i + 1) + '#');
                    fcParams.push(color);
                    legendName = '#minmax_' + (i + 1) + '#';
                }
                else {
                    fcParams.push(color);
                    if (i < numCat - 1) {
                        var val = params['classType'] == 'range' ? thresholds[i] : ('#val_' + (i + 1) + '#');
                        fcParams.push(val);
                    }
                    if (i==0) {
                        legendName = ' - '+'#val_1#';
                    }
                    else if (i == numCat - 1) {
                        legendName = '#val_'+i+'# -'
                    }
                    else {
                        legendName = '#val_'+i+'#'+' - '+'#val_'+(i+1)+'#'
                    }
                    
                    
                }
                
                var legendRule = new OpenLayers.Rule({
                    name: legendName,
                    symbolizer: {
                        'Polygon': new OpenLayers.Symbolizer.Polygon({fillColor: color, strokeColor: '#000000', strokeWidth: 1})
                    }
                })
                legendRules.push(legendRule)
            }
            if (params['classType'] == 'continuous') {
                fcParams.push('color');
            }
            var fcName = params['classType'] == 'continuous' ? 'Interpolate' : 'Categorize';
            var fillColor = new OpenLayers.Filter.Function({name: fcName, params: fcParams});

            symbolizer['Polygon'] = new OpenLayers.Symbolizer.Polygon({fillColor: fillColor, strokeColor: '#000000', strokeWidth: 1});
            var rule1 = {
                filter: filtersNotNull.length > 1 ? new OpenLayers.Filter.Logical({type: '&&', filters: filtersNotNull}) : filtersNotNull[0],
                symbolizer: symbolizer
            };
            var nullColor = params['nullColor'] || '#bbbbbb';
            var nullSymbolizer = {
                'Polygon': new OpenLayers.Symbolizer.Polygon({fillColor: nullColor, strokeColor: '#000000', strokeWidth: 1})
            }
            var rule2 = {
                filter: filtersNull.length > 1 ? new OpenLayers.Filter.Logical({type: '||', filters: filtersNull}) : filtersNull[0],
                symbolizer: nullSymbolizer
            };
            return {
                rules: [rule1, rule2],
                legend: legendRules
            };
        }
        if (params['showMapChart']) {
            symbolizer = {};
            var max = new OpenLayers.Filter.Function({name: 'env', params: ['maxsize']})
            var min = new OpenLayers.Filter.Function({name: 'Div', params: [max, 20]});
            var sizeRange = new OpenLayers.Filter.Function({name: 'Sub', params: [max, min]});
            var valRange = new OpenLayers.Filter.Function({name: 'Sub', params: ['#maxval#', '#minval#']})
            var valFactor = new OpenLayers.Filter.Function({name: 'Sub', params: ['${#attr#}', '#minval#']})

            var factor = new OpenLayers.Filter.Function({name: 'Div', params: [valFactor, valRange]});
            var sizeAdd = new OpenLayers.Filter.Function({name: 'Mul', params: [sizeRange, factor]});
            var size = new OpenLayers.Filter.Function({name: 'Add', params: [min, sizeAdd]});
            var sizeSqrt = new OpenLayers.Filter.Function({name: 'pow', params: [size, 0.5]})

            var url = Config.url + '/api/chart/drawChart/#url#';
            symbolizer['Point'] = new OpenLayers.Symbolizer.Point({externalGraphic: url, graphicFormat: 'image/svg+xml', graphicWidth: sizeSqrt});
            var rule1 = {
                symbolizer: symbolizer
            };
            return [rule1];
        }

    },
    getWmsLayerDefaults: function() {
        var layerParams = {
            singleTile: true,
            visibility: false,
            opacity: 0.7,
            ratio: 1.2,
            transitionEffect: 'resize',
            removeBackBufferDelay: 100
        }
        var params = {
            transparent: true,
            format: 'image/png'
        }
        return {layerParams: layerParams, params: params};
    },
    getChartNamedLayers: function(ruleObjs, year, forLegend) {

        var treeFilterMap = this.getTreeFilters(year);
        var namedLayers = [];
        for (var layerName in treeFilterMap) {
            var filter = treeFilterMap[layerName];
            var rules = [];
            for (var i = 0; i < ruleObjs.length; i++) {
                var ruleObj = ruleObjs[i];
                var newRuleObj = {
                    symbolizer: ruleObj.symbolizer
                }
                if (ruleObj.filter) {
                    newRuleObj.filter = new OpenLayers.Filter.Logical({type: '&&', filters: [filter, ruleObj.filter]})
                }
                else if (!forLegend) {
                    newRuleObj.filter = filter;
                }
                if (forLegend) {
                    newRuleObj.name = ruleObj.name;
                }
                var rule = new OpenLayers.Rule(newRuleObj);
                rules.push(rule)
            }
            var style = new OpenLayers.Style();
            style.addRules(rules);
            namedLayers.push({
                name: layerName,
                userStyles: [style]
            });
            if (forLegend) {
                break;
            }
        }
        return namedLayers;
    },
    
    onLayerClick: function(panel,rec) {
        if (rec.get('type')!='addchoropleth') return;
        this.getController('Chart').onChartBtnClick(panel);
        
    },
            
    addChoropleth: function(cfg,autoActivate) {
        var layerStore = Ext.StoreMgr.lookup('layers');
        var choroplethNode = layerStore.getRootNode().findChild('type','choroplethgroup');
        
        var attr = cfg['attrs'][0];
        var attrObj = Ext.StoreMgr.lookup('attribute').getById(attr.attr);
        //var attrSetObj = Ext.StoreMgr.lookup('attributeset').getById(attr.as);
        
        var layerDefaults = this.getWmsLayerDefaults();
        var mapController = this.getController('Map');
        
        var params = this.getController('Chart').getParams(cfg);
        
        
        var layer1 = new OpenLayers.Layer.WMS('WMS', Config.url + '/api/proxy/wms', Ext.clone(layerDefaults.params), Ext.clone(layerDefaults.layerParams));
        var layer2 = new OpenLayers.Layer.WMS('WMS', Config.url + '/api/proxy/wms', Ext.clone(layerDefaults.params), Ext.clone(layerDefaults.layerParams));
        mapController.map1.addLayers([layer1]);
        mapController.map2.addLayers([layer2]);
        var node = Ext.create('Puma.model.MapLayer', {
            name: params['title']+' - '+attrObj.get('name'),
            attribute: attr.attr,
            attributeSet: attr.as,
            type: 'chartlayer',
            leaf: true,
            params: params,
            cfg: cfg,
            layer1: layer1,
            layer2: layer2,
            checked: autoActivate ? true : false
        });
        choroplethNode.appendChild(node);
        Ext.StoreMgr.lookup('selectedlayers').loadData([node],true);
        if (autoActivate) {
            this.initChartLayer(node);
        }
    },
        
    onChoroplethAdd: function(btn) {
        var form = btn.up('choroplethpanel');
        var cfg = form.getForm().getValues();
        this.addChoropleth(cfg,true);
    },
    
    
    onChoroplethRemove: function(panel,record) {
        var mapController = this.getController('Map');
        mapController.map1.removeLayer(record.get('layer1'));
        mapController.map2.removeLayer(record.get('layer2'));
        record.destroy();
    },    
        
    reconfigureAll: function() {
        var layerStore = Ext.StoreMgr.lookup('layers');
        var choroplethNode = layerStore.getRootNode().findChild('type','choroplethgroup');
        for (var i=0;i<choroplethNode.childNodes.length;i++) {
            var childNode = choroplethNode.childNodes[i];
            this.initChartLayer(childNode);
        }
    },
    
    onChoroplethReconfigure: function(btn) {
        var form = btn.up('choroplethpanel');
        var cfg = form.getForm().getValues();
        var rec = form.chart;
        var params = this.getController('Chart').getParams(cfg);
        
        var attr = cfg['attrs'][0];
        var attrObj = Ext.StoreMgr.lookup('attribute').getById(attr.attr);
        //var attrSetObj = Ext.StoreMgr.lookup('attributeset').getById(attr.as);
        
        rec.set('name',cfg['title']+' - '+attrObj.get('name'));
        rec.set('attributeSet',attr.as);
        rec.set('attribute',attr.attr);
        rec.set('cfg',cfg);
        rec.set('params',params);
        rec.commit();
        this.initChartLayer(rec);
    },
    onChoroplethReconfigureBtnClick: function(panel,rec) {
        var cfg = this.getController('Chart').getChartWindowConfig(rec, true, 'choroplethpanel');
        var window = Ext.widget('window', cfg);
        window.down('choroplethpanel').getForm().setValues(rec.get('cfg'));
        window.show();
    },
    
            
    loadVisualization: function(visId) {
        var store = Ext.StoreMgr.lookup('visualization');
        var vis = Config.cfg ? Config.cfg : store.getById(visId);
        
        if (!vis) {
            
            return;
        }
        
        var mapController = this.getController('Map');
        var cfg = Config.cfg ?  Config.cfg.choroplethCfg : (vis.get('choroplethCfg') || []);
        var layerStore = Ext.StoreMgr.lookup('layers');
        var choroplethNode = layerStore.getRootNode().findChild('type','choroplethgroup');
        for (var i=0;i<choroplethNode.childNodes.length;i++) {
            var childNode = choroplethNode.childNodes[i];
            if (childNode.get('type')=='addchoropleth') continue;
            mapController.map1.removeLayer(childNode.get('layer1'))
            mapController.map2.removeLayer(childNode.get('layer2'))
            choroplethNode.removeChild(childNode);
        }
       
        for (var i = 0; i < cfg.length; i++) {
            this.addChoropleth(cfg[i]);
        }
        
    },
    getLegendUrl: function(layersOrSldId,legendLayerName) {
        var obj = {
            "LAYERS": layersOrSldId,
            "REQUEST": 'GetLegendGraphic',
            "FORMAT": 'image/png',
            "WIDTH": 50
        };
        if (legendLayerName) {
            obj['USE_SECOND'] = true;
            obj['LAYER'] = legendLayerName;
            delete obj['LAYERS'];
            obj['SLD_ID'] = layersOrSldId;
        }
        var query = Ext.Object.toQueryString(obj);
        return Config.url + '/api/proxy/wms?' + query          
    },
    initChartLayer: function(node) {
        if (!node.get('checked')) {
            return;
        }
        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        var params = node.get('params');
        params['areas'] = JSON.stringify(this.getController('Area').lastMap);
        params['showChoropleth'] = 'true';
        var symObjs = this.getSymObj(node.get('params'));
        var ruleObjs = symObjs.rules;
        var legendRules = symObjs.legend;
        for (var i = 0; i < Math.max(2, years.length); i++) {
            var year = years[i];
            var namedLayers = this.getChartNamedLayers(ruleObjs, year);
            var legendNamedLayers = this.getChartNamedLayers(legendRules, year, true);
            node.get('params')['years'] = JSON.stringify([year]);
            if (i == 0 && years.length > 1) {
                node.get('params')['altYears'] = JSON.stringify([years[1]]);
            }
            else if (i == 1) {
                node.get('params')['altYears'] = JSON.stringify([years[0]]);
            }
            else {
                delete node.get('params')['altYears'];
            }
            if (!namedLayers || !namedLayers.length)
                continue;
            var layer = i == 0 ? node.get('layer1') : node.get('layer2');
            this.saveSld(node, namedLayers, layer, node.get('params'), legendNamedLayers);
        }
    },
    onCheckChange: function(node, checked, performUncheck, bypassLegendRedraw) {
        Ext.StoreMgr.lookup('selectedlayers').filter();
        var layer1 = node.get('layer1');
        var layer2 = node.get('layer2');
        
        var me = this;
        if (node.get('type') == 'chartlayer' && node.get('checked')) {
            this.initChartLayer(node);
            return;
        }
        var parentNode = node.parentNode;
        if (parentNode.get('type')=='basegroup' && checked) {
            for (var i=0;i<parentNode.childNodes.length;i++) {
                var childNode = parentNode.childNodes[i];
                if (node!=childNode) {
                    childNode.set('checked',false);
                    me.onCheckChange(childNode,false);
                }
            }
        }
        
        if (layer1.initialized)
            layer1.setVisibility(checked);
        if (layer2.initialized)
            layer2.setVisibility(checked);
        me.onLayerDrop();
    },
    gatherSymbologiesAndOpacities: function() {
        var store = Ext.StoreMgr.lookup('selectedlayers');
        var confs = [];
        store.each(function(rec) {
            var conf = {}
            var type = rec.get('type');
            conf.type = type;
            if (type=='topiclayer') {
                conf.symbologyId = rec.get('symbologyId');
                conf.at = rec.get('at');
            }
            if (type=='chartlayer') {
                conf.attr = rec.get('attribute');
                conf.as = rec.get('attributeSet');
                conf.chartId = rec.get('bindChart').cfg.chartId;
            }
            conf.opacity = rec.get('layer1').opacity || 1;
            confs.push(conf)
        })
        return confs;
    },
    checkVisibilityAndStyles: function() {
        var visId = Ext.ComponentQuery.query('#selvisualization')[0].getValue();
        var vis = Ext.StoreMgr.lookup('visualization').getById(visId);
        if (!vis && !Config.cfg) return;
        var atMap = Config.cfg ? Config.cfg.layerCfg : (vis.get('atMap') || []);
        
        var store = Ext.StoreMgr.lookup('layers');
        var root = store.getRootNode();
        var me = this;
        root.cascadeBy(function(node) {
            var layer1 = node.get('layer1');
            if (!layer1) return;
            var layer2 = node.get('layer2');
            var layerConf = null;
            for (var i=0;i<atMap.length;i++) {
                var selLayer = atMap[i];
                if (selLayer.type != node.get('type')) {
                    continue;
                }
                if (!Ext.Array.contains(['topiclayer','chartlayer'],selLayer.type)) {
                    if (Ext.Array.contains(['areaoutlines','selectedareas'],selLayer.type)) {
                        node.set('sortIndex',i)
                    }
                    else {
                        node.set('sortIndex',1000);
                    }
                    layerConf = selLayer;
                    break;
                }
                if (selLayer.type == 'topiclayer' && selLayer.at == node.get('at') && (selLayer.symbologyId == node.get('symbologyId'))) {
                    node.set('sortIndex',i)
                    layerConf = selLayer;
                    break;
                }
                if (selLayer.type == 'chartlayer' && selLayer.attr == node.get('attribute') && selLayer.as == node.get('attributeSet') && selLayer.chartId==node.get('bindChart').cfg.chartId) {
                    node.set('sortIndex',i)
                    layerConf = selLayer;
                    break;
                } 
            }
            if (layerConf) {
                node.set('checked',true);
                me.onCheckChange(node,true,null,true);
                layer1.setOpacity(layerConf.opacity);
                layer2.setOpacity(layerConf.opacity);
            }
            else {
                node.set('checked',false)
                me.onCheckChange(node,false,null,true);
            }
        })
        store = Ext.StoreMgr.lookup('selectedlayers')
        store.sorters = new Ext.util.MixedCollection();
        
        store.sort('sortIndex','ASC');
        //Ext.ComponentQuery.query('#legendpanel')[0].refresh();

    }
});


