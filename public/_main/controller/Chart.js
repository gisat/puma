Ext.define('PumaMain.controller.Chart', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [ 'Ext.ux.grid.FiltersFeature', 'PumaMain.view.Chart', 'PumaMain.view.VisualizationForm', 'Puma.util.Color', 'PumaMain.view.ChartPanel'],
    init: function() {
        this.control({
            'initialbar #visualizationsbtn': {
                click: this.onOpenVisualizationWindow
            },
            'initialbar #chartbtn': {
                click: this.onChartBtnClick
            },
            'initialbar #savevisbtn': {
                click: this.onVisualizationSave
            },
            'initialbar #urlbtn': {
                click: this.onSaveView
            },
            'visualizationform form': {
                beforesave: this.onBeforeVisualizationSave,
                aftersave: this.onAfterVisualizationSave
            },
            'attributepanel #attributeSet': {
                change: this.onAttrSetChange
            },
            'attributepanel #normAttributeSet': {
                change: this.onAttrSetChange
            },
            'attributepanel #normalizationAttributeSet': {
                change: this.onAttrSetChange
            },
            'attributepanel #addattrbtn': {
                click: this.onAddAttribute
            },
            'attributepanel #removeattrbtn': {
                click: this.onRemoveAttribute
            },
            'chartconfigpanel #addbtn': {
                click: this.onChartAdd
            },
            'chartconfigpanel #reconfigurebtn': {
                click: this.onChartReconfigure
            },
            'chartpanel tool[type=close]': {
                click: this.onChartRemove
            },
            'chartpanel tool[type=help]': {
                click: this.onToggleLegend
            },
            'chartpanel': {
                expand: this.onChartExpand
            },
            'chartpanel tool[type=collapse]': {
                click: this.onExportCsv
            },
            'chartpanel tool[type=search]': {
                click: this.onSwitchZooming
            },
            'chartpanel tool[type=print]': {
                click: this.onUrlClick
            },
            'chartpanel tool[type=save]': {
                click: this.onUrlClick
            },
            '#areapager' : {
                beforechange: this.onPageChange
            },
            '#areapager #onlySelected': {
                toggle: this.onToggleShowSelected
            }
        })
        var me = this;
        $('#sidebar-reports-add').click(function() {
            me.getController('AttributeConfig').onConfigureClick({})
        })

        Highcharts.setOptions({
            lang: {
                thousandsSep: ''
            },
            chart: {
                style: {
                    fontSize: '12px',
                    fontFamily: '"Open Sans", sans-serif',
                    color: '#000',
                    fontWeight: 'normal'
                    
                }
            }
        })
    },
    
    onChartExpand: function(panel) {
        window.setTimeout(function() {
            var series = panel.chart.chart.series;
            if (series) {
                
                for (var i=0;i<series.length;i++) {
                    series[i].show();
                }
            }
        },1)
        
    },
    
    onToggleShowSelected: function(btn) {
        var selCtrl = this.getController('Select');
        var areaCtrl = this.getController('Area');
        var onlySel = btn.pressed;
        var count = onlySel ? (selCtrl.overallCount) : (areaCtrl.lowestCount+selCtrl.outerCount);
        Ext.StoreMgr.lookup('paging').setCount(count);
        this.getController('Chart').reconfigure('outer');    
    },
    
    onToggleLegend: function(btn) {
        var chart = btn.up('panel').chart;
        $(btn.el.dom).toggleClass('tool-active');
        chart.legendOn = chart.legendOn ? false : true;
        this.toggleLegendState(chart.chart, chart.legendOn);
    },
    onSwitchZooming: function(btn) {
        var chart = btn.up('panel').chart;
        $(btn.el.dom).toggleClass('tool-active');
        chart.zooming = chart.zooming ? false : true;
    },
    onExportCsv: function(btn) {
        var chart = btn.up('panel').chart;
        this.reconfigureChart(chart, true);
    },
    onSaveView: function() {
        var cfg = {};
        cfg.chartCfg = this.gatherCfg();
        cfg.layerCfg = this.getController('Layers').gatherSymbologiesAndOpacities();
        var map = this.getController('Map').map1;
        cfg.mapCfg = {
            center: map.center,
            size: map.size,
            zoom: map.zoom
        }
        cfg.dataset = Ext.ComponentQuery.query('initialbar #datasetcontainer button[pressed=true]')[0].objId;
        cfg.theme = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0].objId
        cfg.years = Ext.Array.pluck(Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]'), 'objId');
        cfg.visualization = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[pressed=true]')[0].objId
        cfg.expanded = this.getController('Area').getExpandedAndFids().expanded;
        cfg.selMap = this.getController('Select').selMap;
        //cfg.multipleMaps = Ext.ComponentQuery.query('initialbar #multiplemapsbtn')[0].pressed==true;
        Ext.Ajax.request({
            url: Config.url + '/api/urlview/saveView',
            params: {
                cfg: JSON.stringify(cfg)
            },
            scope: this,
            method: 'POST',
            success: function(response) {
                var id = JSON.parse(response.responseText).data;
                var url = window.location.origin + '/index2.html?id=' + id;
                //console.log(url);
            }
        })
    },
    onAfterVisualizationSave: function(formCmp, rec, operation) {
        if (operation.action == 'update') {
            var btn = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[objId=' + rec.get('_id') + ']')[0]
            if (!btn)
                return;
            btn.setText(rec.get('name'));
        }
        else {
            var container = Ext.ComponentQuery.query('initialbar #visualizationcontainer')[0];
            var conf = {text: rec.get('name'), objId: rec.get('_id'), allowDepress: false};
            container.insert(container.items.length - 1, conf);
            var btn = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[objId=' + rec.get('_id') + ']')[0];

            var btns = Ext.ComponentQuery.query('initialbar #visualizationcontainer button');
            for (var i = 0; i < btns.length; i++) {
                btns[i].toggle(false, true);
            }
            btn.toggle(true, true)
        }
    },
    onOpenVisualizationWindow: function(btn) {
        var themeBtn = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0]
        var theme = themeBtn ? themeBtn.objId : null;
        if (!theme)
            return;

        var visualizationStore = Ext.StoreMgr.lookup('visualization4window');
        visualizationStore.clearFilter(true);
        visualizationStore.filter([function(rec) {
                return rec.get('theme') == theme;
            }])
        var window = Ext.WindowManager.get('visualizationwindow');
        window = window || Ext.widget('window', {
            layout: 'fit',
            id: 'visualizationwindow',
            y: 200,
            items: [{
                    xtype: 'visualizationform',
                    frame: true,
                    theme: theme
                }]
        })
        window.show();
    },
    onVisualizationSave: function(btn) {
        var visBtn = Ext.ComponentQuery.query('initialbar #visualizationcontainer button[pressed=true]')[0]
        if (!visBtn)
            return;
        var vis = Ext.StoreMgr.lookup('visualization').getById(visBtn.objId);
        var cfg = this.gatherCfg();
        if (!cfg.length) {
            return false;
        }
        var atMap = this.getController('Layers').gatherSymbologiesAndOpacities();
        vis.set('atMap', atMap);
        vis.set('cfg', cfg);
        vis.save();
    },
    onBeforeVisualizationSave: function(formCmp, rec) {
        if (!rec.stores.length) {
            var cfg = this.gatherCfg();
            if (!cfg.length) {
                return false;
            }
            var atMap = this.getController('Layers').gatherSymbologiesAndOpacities();

            rec.set('atMap', atMap);
            rec.set('cfg', cfg); }
    },
    gatherChartCfg: function(chart, useQueryCfg) {
        chart.cfg.chartId = chart.cfg.chartId || parseInt(Math.random() * 10000000)
        var cfg = useQueryCfg ? {} : Ext.clone(chart.cfg);
        var legendItems = chart.chart && chart.chart.legend && useQueryCfg ? chart.chart.legend.allItems : [];
        if (legendItems.length) {
            cfg.invisibleAttrs = [];
            cfg.invisibleYears = [];

        }
        if (chart.cfg.type == 'grid' && chart.chart && chart.chart.store && useQueryCfg) {
            Ext.apply(cfg,this.getSortParamsFromGrid(chart.chart,true));
        }
        for (var j = 0; j < legendItems.length; j++) {
            var legendItem = legendItems[j];
            if (legendItem.visible)
                continue;
            if (legendItem.as) {
                cfg.invisibleAttrs.push({as: legendItem.as, attr: legendItem.attr})
            }
            else if (legendItem.userOptions.as) {
                cfg.invisibleAttrs.push({as: legendItem.userOptions.as, attr: legendItem.userOptions.attr})
            }
            else if (legendItem.userOptions.year) {
                cfg.invisibleYears.push(legendItem.userOptions.year)
            }
        }
        return cfg
    },
    gatherCfg: function(useQuery) {
        var charts = Ext.ComponentQuery.query('chartbar chartcmp');
        var cfgs = [];
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            var cfg = this.gatherChartCfg(chart,useQuery);
            
            cfgs.push(cfg);
        }
        return cfgs;
    },
    onSaveVis: function(btn) {
        if (!this.activeVis)
            return;
        var cfg = this.gatherCfg();
        this.activeVis.set('cfg', cfg);
        this.activeVis.save();
    },
    loadVisualization: function(visId) {
        var store = Ext.StoreMgr.lookup('visualization');
        var vis = Config.cfg ? null : store.getById(visId);

        var cfg = Config.cfg ? Config.cfg.cfgs : null;
        if (vis) {
            cfg = vis.get('cfg');
        }
        cfg = cfg || [];
        var container = Ext.ComponentQuery.query('chartbar')[0];
        var me = this;
        container.items.each(function(item) {
            if (item.xtype == 'chartpanel') {
                me.onChartRemove(null, item);
            }

        })
        for (var i = 0; i < cfg.length; i++) {
            if (cfg.type != 'filter') {
                if (Config.cfg) {
                    this.addChart(cfg[i].cfg, true,cfg[i].queryCfg);
                }
                else {
                    this.addChart(cfg[i], true);
                }
            }
                
        }

    },
    onChartAdd: function(btn) {
        var form = btn.up('chartconfigpanel');
        var cfg = form.getForm().getValues();
        this.addChart(cfg);

    },
    addChart: function(cfg, withoutReconfigure, queryCfg) {
        var container = Ext.ComponentQuery.query('chartbar')[0];
        if (cfg.type=='grid') {
            
        }
        var opts = {
            height: 400,
            width: 575,
            style: {
                //"overflowX": 'hidden ! important'
            },
            layout: 'fit'
        };
        if (cfg.type == 'extentoutline') {
            opts.layout = {
                type: 'absolute'
            }
            //opts.height = null;
        }
        if (cfg.type=='grid') {
            var hasGrid = false;
            container.items.each(function(item) {
                if (item.chart && item.chart.cfg.type=='grid') {
                    hasGrid = true;
                    return false;
                }
            })
            if (hasGrid) {
                opts.disableSort = true;
            }
        }
        var chart = Ext.widget('chartcmp', opts);
        var items = [chart];


        var cnt = Ext.widget('chartpanel', {
            title: cfg.title || ('Anonymous ' + cfg.type),
            cfgType: cfg.type,
            iconCls: 'cmptype-'+cfg.type,
            layout: {
                type: 'fit',
                reserveScrollbar: true
            },
            items: items
        })
        container.add(container.items.length, cnt);
        chart.cfg = cfg;
        chart.queryCfg = queryCfg;
        chart.cnt = cnt;
        cnt.chart = chart;
        if (!withoutReconfigure) {
            this.reconfigureChart(chart, false, true);
        }
    },
    onChartRemove: function(btn, panel) {

        var panel = btn ? btn.up('panel') : panel;
        if (panel.chart.chart && panel.chart.chart.renderTo) {
            panel.chart.chart.destroy();
        }
        panel.destroy();
        
    },
    toggleLegendState: function(chart, on) {
        var id = chart.container.id;
        var selector = '#' + id + ' .highcharts-legend';
        if (on) {
            $(selector).show();
        }
        else {
            $(selector).hide();
        }
    },
    onChartReconfigure: function(btn) {
        var form = btn.up('chartconfigpanel');
        var cfg = form.getForm().getValues();
        form.chart.cfg = cfg;
        this.reconfigureChart(form.chart);
    },
    getChartWindowConfig: function(chart, reconfiguring, type) {
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var dataset = Ext.StoreMgr.lookup('dataset').getById(datasetId);
        var areaTemplates = dataset.get('featureLayers');
        var store = Ext.create('Gisatlib.data.SlaveStore', {
            slave: true,
            filters: [function(rec) {
                    return Ext.Array.contains(areaTemplates, rec.get('_id'));
                }],
            model: 'Puma.model.AreaTemplate'
        })
        store.load();
        var cfg = {
            layout: 'fit',
            y: 200,
            items: [{
                    xtype: type,
                    areaTemplateStore: store,
                    chart: chart,
                    reconfiguring: reconfiguring
                }]
        }
        if (!reconfiguring) {
            cfg['closeAction'] = 'hide'
            cfg['id'] = 'new' + type
        }
        return cfg;
    },
    
    reconfigureChart: function(chartCmp, forExport, addingNew, fromConfigPanel) {
        var cfg = chartCmp.cfg;
        var chartPanel = chartCmp.up('chartpanel');
        chartPanel.cfgType = cfg.type;
        chartPanel.updateToolVisibility();
        if (cfg.type=='piechart') {
            //debugger;
        }
        var queryCfg = Ext.apply(chartCmp.queryCfg || {},chartCmp.cfg,this.gatherChartCfg(chartCmp,true));
        var areas = {};
        if (cfg.type != 'extentoutline') {
            areas = Ext.clone(this.getController('Area').lowestMap);
        }
        var onlySel = Ext.ComponentQuery.query('#areapager #onlySelected')[0].pressed;
        
        
        if (cfg.title && fromConfigPanel) {
            chartCmp.up('chartpanel').setTitle(cfg.title)
        }
        queryCfg.areas = areas;

        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
        if (!years.length)
            return;
        queryCfg.years = years;

        if (!queryCfg.years) {
            queryCfg.years = [];
        }
        if (!queryCfg.years.length) {
            queryCfg.years = [queryCfg.years]
        }
        
        if (Ext.Array.contains(['grid','columnchart','piechart'],cfg.type)) {
            var onlySel = Ext.ComponentQuery.query('#areapager #onlySelected')[0].pressed;
            if (onlySel) {
                queryCfg.areas = [];
            }
            Ext.apply(queryCfg,this.getPagingParams());
        }
        if (cfg.type=='scatterchart') {
            delete queryCfg['start'];
            delete queryCfg['limit'];
        }
        if (cfg.type=='extentoutline' || cfg.type == 'scatterchart') {
            var selectedAreas = this.getSelectedAreas()
            queryCfg.selectedAreas = JSON.stringify(selectedAreas.selectedAreas);
            queryCfg.defSelectedArea = JSON.stringify(selectedAreas.defArea);
        }
        var params = this.getParams(queryCfg);
        chartCmp.queryCfg = queryCfg;
        if (forExport) {
            this.handleExport(chartCmp,params);
            return;
            
        }
        if (queryCfg['start']<0) {
            this.onChartReceived({cmp:chartCmp});
            return;
        }
        Ext.Ajax.request({
            url: Config.url + '/api/chart/getChart',
            params: params,
            scope: this,
            //method: 'GET',
            cmp: chartCmp,
            success: forExport ? null : this.onChartReceived,
            failure: forExport ? null : this.onChartReceived
        })
        //this.getController('Layers').onChartReconfigure(chartCmp, params);
    },
        
        
        
    getSelectedAreas: function() {
        var selectedAreas = [];
        var selMap = this.getController('Select').selMap;
        var defColor = this.getController('Select').defaultColor;
        var colors = [];
        var picker = Ext.ComponentQuery.query('#useselectedcolorpicker')[0];
        var onlySelected = Ext.ComponentQuery.query('#onlySelected')[0].pressed;
        var selectColors = picker.xValue || picker.value;
        selectColors = Ext.isArray(selectColors) ? selectColors : [selectColors]
        for (var color in selMap) {
            if (!Ext.Array.contains(selectColors,color) && onlySelected) {
                continue;
            }
            colors.push(color);
        }
        var selMaps = [];
        var map = {};
        var defMap = null;
        for (var i = 0; i < colors.length; i++) {
            
            var actualMap = selMap[colors[i]];
            if (actualMap && actualMap.length) {
                selMaps.push(actualMap);
                if (colors[i]==defColor) {
                    defMap = actualMap;
                }
            }
            
        }
        var defArea = null;
        for (var i = 0; i < selMaps.length; i++) {
            var selMap = selMaps[i];
            var map = {};
            for (var j = 0; j < selMap.length; j++) {
                var at = selMap[j].at;
                var gid = selMap[j].gid;
                var loc = selMap[j].loc;
                map[loc] = map[loc] || {};
                map[loc][at] = map[loc][at] || [];
                map[loc][at].push(gid);
                if (selMap==defMap && !defArea) {
                    defArea = {
                        loc: loc,
                        at: at,
                        gid: gid
                    }
                    
                }
            }
            selectedAreas.push(map);
        }
        return {selectedAreas:selectedAreas,defArea:defArea};
    },
    
    handleExport: function(chartCmp, params) {
        params = Ext.clone(params);
        delete params.start;
        delete params.limit;
        var items = [{
                xtype: 'filefield',
                name: 'file'
            }];
        for (var key in params) {
            items.push({
                xtype: 'textfield',
                name: key,
                value: params[key]
            })
        }
        var form = Ext.widget('form', {
            items: items
        });
        form.getForm().submit({
            url: Config.url + '/api/chart/getGridDataCsv',
            success: function() {
            },
            failure: function() {
            }
        });
        return;
    },
    getParams: function(queryCfg) {
        var params = {};
        //commented by Jonas, Feb. 2016
        //var keysToJson = ['areas', 'attrs', 'years', 'classConfig', 'areaTemplates', 'oldAreas', 'invisibleAttrs', 'invisibleYears', 'activeFilters', 'activeSorters'];
        for (var key in queryCfg) {
            if (Ext.isObject(queryCfg[key]) || Ext.isArray(queryCfg[key])) {
                params[key] = JSON.stringify(queryCfg[key])
            }
            else {
                params[key] = queryCfg[key]
            }
        }
        return params;
    },
    onOutlineReceived: function(data, cmp) {
        cmp.removeAll();
        cmp.layout = {
            type: 'absolute'
        }
        cmp.getLayout();
        data.layerRefs = data.layerRefs || [];
        var l = data.layerRefs.length
        //var anchor = data.layerRefs.length==1 ? '100% 100%' : '45% 100%';
        //anchor = data.layerRefs.length<3 ? anchor : '45% 45%'
        var width = l==1 ? 550 : 264;
        var height = l<3 ? 300 : 140;
        var colorMap = data.colorMap || this.getController('Select').colorMap;
        cmp.mapNum = data.layerRefs.length;
        for (var i = 0; i < data.layerRefs.length; i++) {
            
            var layerRefs = data.layerRefs[i];
            var item = layerRefs.item;
            var color = (colorMap[item.loc] && colorMap[item.loc][item.at]) ?  colorMap[item.loc][item.at][item.gid] : null;
            if (!color) continue;
            var rows = data.rows[i];
            var anchor = '100% 100%'
            var x = 0;
            var y = 0;
            
            if (i==0 && l>1) {
                anchor = '50% 100%';
            }
            if (i==0 && l>2) {
                anchor = '50% 49%'
            }
            if (i==1) {
                anchor = '100% 100%';
                if (l>2) {
                    anchor = '100% 49%';
                }
                x = 285;
            }
            if (i==2) {
                y = 200;
                anchor = '50% 100%'
            }
                

            if (i==3) {
                x = 285;
                y = 200;
            }
            cmp.add({
                xtype: 'component', color: color, type: 'extentoutline', cls:i==0 ? 'extentoutline-first' : 'extentoutline-notfirst' ,opacity: data.opacity, width: width, height: height, anchor: anchor, x: x, y: y, layerRefs: layerRefs, rows: rows, colSpan: data.layerRefs==1 ? 2 : 1
            })
        }

    },
    
    createNoDataChart: function(cmp) {

        var cfg = {
            chart: {
                renderTo: cmp.el.dom
            },
            title: {
                text: null
            },
            credits: {
                enabled: false
            },
            labels: {items: [{
                        html: 'Please select areas...',
                        style: {
                            left: '125px',
                            top: '180px',
                            fontSize: 34,
                            fontFamily: '"Open Sans", sans-serif',
                            color: '#777777'

                        }
                    }]}};
        
        var chart = new Highcharts.Chart(cfg);
        cmp.chart = chart;
        chart.cmp = cmp;
    },
    
    onChartReceived: function(response) {
        var cmp = response.cmp || response.request.options.cmp;
        
        if (cmp.chart) {
            
            try {
                cmp.chart.destroy();
            }
            catch (e) {
            }
        }
        
        
        var data = response.responseText ? JSON.parse(response.responseText).data : null;
        if (cmp.queryCfg.type == 'filter') {
            //this.onFilterReceived(data, cmp)
            return;
        }
       
        
        
        if (!data || data.noData) {
            this.createNoDataChart(cmp);
            return;
        }
        
        var singlePage = response.request.options.singlePage
        //var legendBtn = singlePage ? Ext.widget('button') : Ext.ComponentQuery.query('#legendbtn', cmp.ownerCt)[0];
        
        cmp.noData = false;
        if (Ext.Array.contains(['extentoutline'], cmp.cfg.type)) {
            if (singlePage) {
                data.colorMap = JSON.parse(response.request.options.params.colorMap)
            }
            this.onOutlineReceived(data, cmp);
            return;
        }
        cmp.layout = {
            type: 'fit'
        }
        cmp.getLayout();
        
        if (!Ext.Array.contains(['grid', 'featurecount'], cmp.cfg.type)) {
            //legendBtn.show();
        }
        var isGrid = cmp.queryCfg.type == 'grid';
        if (isGrid) {
            this.onGridReceived(response);
            return;
        }
        data.chart.events = {};
        var me = this;
        data.chart.events.selection = function(evt) {
            me.onScatterSelected(evt);
        }
        data.chart.events.click = function(evt) {
            
            if (Config.contextHelp) {
                PumaMain.controller.Help.onHelpClick({
                    stopPropagation: function() {},
                    preventDefault: function() {},
                    currentTarget: cmp.el
                });
            }
        }
        data.tooltip.formatter = function() {
            var obj = this;
            var type = obj.series.type;
            var attrConf = [];
            var yearName = '';
            var areaName = '';
            if (type=='column') {
                areaName = obj.x;
                yearName = obj.point.yearName;
                attrConf.push({
                    name: obj.series.name,
                    val: obj.y,
                    units: obj.point.units
                })
            }
            else if (type=='pie') {
                areaName = obj.series.name;
                yearName = obj.series.userOptions.yearName
                attrConf.push({
                    name: obj.point.swap ? 'Other' : obj.key,
                    val: obj.y,
                    units: obj.point.units
                })
            }
            else {
                areaName = obj.key;
                yearName = obj.series.name;
                attrConf.push ({
                    name: obj.point.yName,
                    val: obj.point.y,
                    units: obj.point.yUnits
                })
                attrConf.push ({
                    name: obj.point.xName,
                    val: obj.point.x,
                    units: obj.point.xUnits
                })
                if (obj.point.zName) {
                    attrConf.push({
                        name: obj.point.zName,
                        val: obj.point.z,
                        units: obj.point.zUnits
                    })
                }
            }
            return me.getTooltipHtml(areaName,yearName,attrConf)
        }
        data.plotOptions = data.plotOptions || {series: {events: {}}}

        data.plotOptions.series.events.click = function(evt) {
            if (Config.contextHelp) {
                PumaMain.controller.Help.onHelpClick({
                    stopPropagation: function() {},
                    preventDefault: function() {},
                    currentTarget: this.chart.cmp.el
                });
                return;
            }
            me.onPointClick(this.chart.cmp, evt, false)
        }
        if (cmp.cfg.type == 'piechart') {
            data.plotOptions.series.events.mouseOver = function(evt) {
                me.onPointClick(this.chart.cmp, evt, true)
            }
        }
        else if (cmp.cfg.type != 'featurecount') {
            data.plotOptions.series.point.events.mouseOver = function(evt) {
                me.onPointClick(this.series.chart.cmp, evt, true)
            }
            if (cmp.cfg.type == 'scatterchart') {
                data.plotOptions.series.point.events.mouseOut = function(evt) {
                    $('path[linecls=1]').hide();
                }
            }
        }

        if (cmp.cfg.type == 'piechart') {
            data.plotOptions.pie.point.events.legendItemClick = function(evt) {
                evt.preventDefault();
                var isSingle = this.series.chart.options.chart.isPieSingle;
                if (!isSingle) {
                    me.onLegendToggle(this);
                    
                }
            }
        }
        data.exporting = {
            enabled: false
        }
        data.chart.renderTo = cmp.el.dom;
        data.chart.events.load = function() {
            if (this.options.chart.isPieSingle) {
                var chart = this;
                var rend = chart.renderer;
                for (var i=0;i<chart.series.length;i++) {
                    var serie = chart.series[i];
                    var left = chart.plotLeft + serie.center[0];
                    var top = chart.plotTop + serie.center[1]+serie.options.pieFontShift;
                    var text = rend.text(serie.options.pieText, left,  top).attr({ 'style':'','text-anchor': 'middle','font-size':serie.options.pieFontSize,'fill':serie.options.pieFontColor}).add();
                }
                                          
            }
            if (cmp.cfg.scrollLeft && singlePage) {
                $('.x-container').scrollLeft(cmp.cfg.scrollLeft)
                $('.x-container').css('overflow','hidden');
            }
            if (singlePage) {
                console.log('loadingdone')
            }
        }
        if (singlePage) {
            for (var i = 0; i < data.series.length; i++) {
                data.series[i].animation = false;
            }
        }
        var chart = new Highcharts.Chart(data);
        cmp.chart = chart;
        chart.cmp = cmp;
        var panel = cmp.ownerCt;
        if (!singlePage) {
            me.toggleLegendState(chart, cmp.legendOn);
        }
        this.colourChart(cmp);
    },
    onUrlClick: function(btn) {
        var chart = btn.up('panel').chart;
        var cfg = Ext.apply(Ext.clone(chart.queryCfg),this.gatherChartCfg(chart, true));
        
        cfg.oldAreas = chart.cfg.areas;
        cfg.colorMap = this.getController('Select').colorMap;
        var me = this;
        if (chart.noData) {
            return;
        }
        var scrollLeft = 0;
        if (cfg.type == 'grid') {
            scrollLeft = $(chart.chart.el.dom).find('.x-grid-with-row-lines:not(.x-grid-inner-locked)').find('.x-grid-view').scrollLeft()
        }
        if (cfg.type == 'columnchart') {
            scrollLeft = $(chart.el.dom).scrollLeft()
        }
        if (scrollLeft) {
            cfg.scrollLeft = scrollLeft;
        }
        Puma.util.Msg.msg('Snapshot creation started','','r');
        Ext.Ajax.request({
            url: Config.url + '/api/urlview/saveChart',
            params: {
                cfg: JSON.stringify(cfg)
            },
            scope: this,
            method: 'POST',
            success: function(response) {
                var id = JSON.parse(response.responseText).data;
                me.onUrlCallback(id, btn.type == 'print');
            }
        })



    },
    onUrlCallback: function(id, isPrint){
        if(true){
            var url = (window.location.origin + window.location.pathname).split('public')[0]; /// JJJJ co s tim? Public uz neni.
        }
        if (isPrint) {
            url = url + 'print/index-for-export.html?id=' + id;
            var form = Ext.widget('form'
                    , {
                items: [{
                        xtype: 'filefield',
                        name: 'file'
                    }, {
                        xtype: 'textfield',
                        name: 'dummy',
                        value: 'dummy'
                    }]
            });
            form.getForm().submit({
                url: url
            });
        }
        else {
            url = url + 'image/index-for-export.html?id=' + id;
            var rec = Ext.StoreMgr.lookup('screenshot').findRecord('large',true);
            var screenshot = Ext.create('Puma.model.Screenshot',{
                src: url,
                visible: rec ? 0 : 1
            })
            var snapshotPanel = Ext.ComponentQuery.query('chartbar #screenshotpanel')[0];
            snapshotPanel.show();
            Ext.StoreMgr.lookup('screenshot').loadData([screenshot],true);
            var img = Ext.DomQuery.select('img[src="'+url+'"]');
            Ext.get(img[0]).on('load',function() {
                Puma.util.Msg.msg('Snapshot done','','r');
                var snapshotPanel = Ext.ComponentQuery.query('chartbar #screenshotpanel')[0];
                snapshotPanel.expand();
            })
        }
    },
    
    onLegendToggle: function(point) {
        var as = point.as;
        var attr = point.attr;
        var chart = point.series.chart;
        var series = chart.series;
        for (var i = 0; i < series.length; i++) {
            var serie = series[i];
            for (var j = 0; j < serie.data.length; j++) {
                var point = serie.data[j];
                if (point.attr == attr && point.as == as) {
                    serie.isDirty = true;
                    point.setVisible();
                    break;
                }
            }
        }
        chart.redraw();

    },
    onPointClick: function(cmp, evt, hovering) {
        if (hovering && !this.hovering && cmp.cfg.type != 'scatterchart')
            return;
        var at = null;
        var gid = null;
        var loc = null;
        if (cmp.cfg.type == 'piechart') {
            var serie = hovering ? evt.target : evt.point.series;
            at = serie.options.at;
            loc = serie.options.loc;
            gid = serie.options.gid;
        }
        else {
            var point = evt.point || evt.target;
            at = point ? point.at : null;
            gid = point ? point.gid : null;
            loc = point ? point.loc : null;
        }
        if (!at || !gid || !loc)
            return;
        if (!this.hovering && hovering && cmp.cfg.type == 'scatterchart') {
            var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
            if (years.length<2) return;
            $('path[linecls=1]').hide();
            if (point.yearLines) {
                for (var i = 0; i < point.yearLines.length; i++) {
                    $(point.yearLines[i].element).show();
                    point.yearLines[i].toFront();
                }
            }
            else {
                var points = [];
                for (var i = 0; i < cmp.chart.series.length; i++) {
                    points = Ext.Array.merge(points, cmp.chart.series[i].points);
                }
                for (var i = 0; i < points.length; i++) {
                    var iterPoint = points[i];
                    if (point == iterPoint) {
                        continue;
                    }
                    if (point.at == iterPoint.at && point.gid == iterPoint.gid && point.loc == iterPoint.loc) {
                        var xPlus = point.graphic.renderer.plotBox.x;
                        var yPlus = point.graphic.renderer.plotBox.y;
                        var line = point.graphic.renderer.path(['M', point.plotX + xPlus, point.plotY + yPlus, 'L', iterPoint.plotX + xPlus, iterPoint.plotY + yPlus])
                                .attr({
                            'stroke-width': 2,
                            linecls: 1,
                            stroke: '#888'
                        })

                        line.add();
                        line.toFront();
                        point.yearLines = point.yearLines || [];
                        point.yearLines.push(line)
                    }
                }
            }
            if (!this.hovering) {
                return;
            }
        }
        var areas = [{at: at, gid: gid, loc: loc}]
        var add = evt.originalEvent ? evt.originalEvent.ctrlKey : evt.ctrlKey;
        var fromChart = cmp.cfg.type=='grid' || cmp.cfg.type=='piechart' || cmp.cfg.type=='columnchart';
        //this.
        if (!Config.exportPage) {
            this.getController('Select').fromChart = fromChart;
            this.getController('Select').select(areas, add, hovering);
        }
        evt.preventDefault();
    },
    onScatterSelected: function(evt) {
//        var zooming = Ext.ComponentQuery.query('#switchzoomingbtn',evt.target.cmp.cnt)[0].pressed

        var chart = evt.target.cmp;
        var zooming = chart.zooming;
        if (zooming || !evt.xAxis) {
            return true;

        }
        var xAxis = evt.xAxis[0];
        var yAxis = evt.yAxis[0];
        var xMin = xAxis.min;
        var yMin = yAxis.min;
        var xMax = xAxis.max;
        var yMax = yAxis.max;
        var atGids = [];
        var points = [];
        for (var i = 0; i < xAxis.axis.series.length; i++) {
            points = Ext.Array.merge(points, xAxis.axis.series[i].points);
        }
        var areas = [];
        for (var i = 0; i < points.length; i++) {
            var point = points[i];

            if (point.x > xMin && point.x < xMax && point.y > yMin && point.y < yMax) {
                var atGid = point.at + '_' + point.gid + '_' + point.loc;
                if (!Ext.Array.contains(atGids, atGid)) {
                    areas.push({at: point.at, gid: point.gid, loc: point.loc});
                    atGids.push(atGid)
                }
            }
        }
        var add = evt.originalEvent.ctrlKey;
        if (!Config.exportPage) {
            
            this.getController('Select').fromScatterChart = true;
            this.getController('Select').select(areas, add, false);
        }
        evt.preventDefault();
    },
        
    getPagingParams: function() {
        var store =  Ext.StoreMgr.lookup('paging');
        var page = store.currentPage;
        var chartCmps = Ext.ComponentQuery.query('chartcmp');
        
        var grid = Ext.ComponentQuery.query('grid[isGrid]')[0];
        var params = {
            start: store.pageSize*(page-1),
            limit: store.pageSize
        }
        if (grid) {
            Ext.apply(params,this.getSortParamsFromGrid(grid));
        }
        else {
            for (var i=0;i<chartCmps.length;i++) {
                var cmp = chartCmps[i]
                if (cmp.cfg.type=='grid') {
                    grid = cmp;
                    break;
                }
            
            }
            if (grid && grid.queryCfg) {
                params['sort'] = Ext.isString(grid.queryCfg.sort) ? grid.queryCfg.sort : JSON.stringify(grid.queryCfg.sort)
                params['sortNorm'] = Ext.isString(grid.queryCfg.sortNorm) ? grid.queryCfg.sortNorm : JSON.stringify(grid.queryCfg.sortNorm)
            }
            else {
                params['sort'] = null;
            }
        }
        
        
        var selectedAreas = this.getSelectedAreas();
        params['selectedAreas'] = JSON.stringify(selectedAreas.selectedAreas);
        params['defSelectedArea'] = JSON.stringify(selectedAreas.defArea);
        return params;
    },
        
    getSortParamsFromGrid: function(grid,dontStringify) {
            var params = {};
            var sorters = grid.store.sorters;
            var sortProps = [];
            var cfg = grid.cmp.cfg;
            var sortAs = null;
            var sortAttr = null;
            sorters.each(function(sorter) {
                sortProps.push({
                    property: sorter.property,
                    direction: sorter.direction
                })
                if (sorter.property!='name') {
                    sortAs = sorter.property.split('_')[1]
                    sortAttr = sorter.property.split('_')[3];
                }
            })
            if (sortAs) {
                for (var i=0;i<cfg.attrs.length;i++) {
                    var attr = cfg.attrs[i];
                    if (attr.as == sortAs && attr.attr == sortAttr) {
                        params['sortNorm'] = dontStringify ? attr : JSON.stringify(attr);
                    }
                }
            }
            
            if (sortProps.length) {
                params['sort'] = dontStringify ? sortProps : JSON.stringify(sortProps)
            }
            else {
                params['sort'] = null;
            }
            return params;
    },
    
    onGridReceived: function(response) {
        var me = this;
        var data = JSON.parse(response.responseText).data;
        var cmp = response.request.options.cmp;
        var sorters = response.request.options.params['sort'] ? JSON.parse(response.request.options.params['sort']) : [];
        var store = Ext.create('Ext.data.Store', {
            fields: data.fields,
            autoLoad: false,
            cmp: cmp,
            // vypnuto defaultni sortovani, rizeno pouze extraParams
            doSort: function() {},
            sorters: sorters,
            proxy: {
                type: 'ajax',
                reader: {
                    type: 'json',
                    root: 'data'
                },
                url: Config.url + '/api/chart/getGridData',
                getMethod: function() {
                    return 'POST'
                },
                extraParams: response.request.options.params
            }
        });
        store.on('load',function(st,records,successful) {
            if (!successful || !records || !records.length) {
                this.onChartReceived({cmp:st.cmp});
            }
        },this)
        var selectController = this.getController('Select');
        var me = this;
        for (var i=0;i<data.columns.length;i++) {
            var column = data.columns[i];
            column.menuDisabled = true;
            column.resizable = false;
            column.sortable = cmp.disableSort!==true;
            if (column.dataIndex=='name') {
                if (data.columns.length>5) {
                    column.locked = true;
                    column.width = 160;
                    column.flex = null;
                    
                 }
                 continue;
            }
            column.renderer = function(val,metadata,rec,rowIndex,colIndex) {
                var columns = this.view.getGridColumns();
                var column = columns[colIndex];
                var attrConf = [{
                    name: column.fullName,
                    val: val,
                    units: column.units
                }]
                var html = me.getTooltipHtml(rec.get('name'),column.yearName,attrConf)
                metadata.tdAttr = 'data-qtip="' + html + '"';
                
                return me.formatVal(val);
            }
        }
        var grid = Ext.widget('grid', {
            renderTo: cmp.el,
            height: '100%',
            header: false,
            store: store,
            isGrid: true,
            title: cmp.cfg.title,
            //frame: true,
            //padding: 10,
            viewConfig: {
                getRowClass: function(record, rowIndex, rowParams, store) {
                    var colorMap = cmp.cfg.colorMap || selectController.colorMap;
                    var at = record.get('at');
                    var gid = record.get('gid');
                    var loc = record.get('loc');
                    var color = '';
                    if (colorMap[loc] && colorMap[loc][at]) {
                        color = colorMap[loc][at][gid] || '';
                    }
                    return color ? ('select_' + color) : ''
                }
            },
            columns: data.columns
        })
        store.load();
        var singlePage = response.request.options.singlePage
        store.on('load',function() {
            if (cmp.queryCfg.scrollLeft && singlePage) {
                $('.x-grid .x-grid-with-row-lines:not(.x-grid-inner-locked) .x-grid-view').scrollLeft(cmp.queryCfg.scrollLeft);
                $('.x-grid .x-grid-with-row-lines:not(.x-grid-inner-locked) .x-grid-view').css('overflow','hidden');
            }
            window.setTimeout(function() {
                console.log('loadingdone');
            }, 200)
        })
        cmp.chart = grid;
        grid.cmp = cmp;
        cmp.relayEvents(grid, ['beforeselect', 'itemclick', 'itemmouseenter']);
        grid.on('sortchange',function() {
            me.reconfigure('page');
        })
        var attrs = JSON.parse(response.request.options.params['attrs']);
        var years = JSON.parse(response.request.options.params['years']);
        grid.view.on('viewready', function() {
            if (years.length*attrs.length<5)
                grid.view.el.setStyle ({
                    overflow: 'hidden'
                })  
        })

    },
    
    getTooltipHtml: function(areaName,yearName,attrConf) {
        var html = areaName+' ('+yearName+')';
        for (var i=0;i<attrConf.length;i++) {
            html += '<br/>'
            var conf = attrConf[i];
            html += conf.name+': '
            html +=  '<b>'+this.formatVal(conf.val)+'</b> ';
            html += conf.units
        }
        return html;
    },
    formatVal: function(val) {
        if (this.isInt(val)) return val;
        var deci = 3;
        if (val>1) deci = 2;
        if (val>100) deci = 1;
        if (val>10000) deci = 0;
        return val!=null ? val.toFixed(deci) : val;
    },
    isInt: function(value) {
        return !isNaN(parseInt(value,10)) && (parseFloat(value,10) == parseInt(value,10));
    },
    
    onPageChange: function() {
        var me = this;
        window.setTimeout(function() {
            me.reconfigure('page');
        },1)
        
    },
    
    reconfigure: function(type) {
        var charts = Ext.ComponentQuery.query('chartcmp');
        var selCtrl = this.getController('Select')
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            if (type=='immediate') {
                this.colourChart(chart);
            }
            else if (Ext.Array.contains(['expand'],type)) {
                this.reconfigureChart(chart);
            }
            
            else if (Ext.Array.contains(['outerscatter'],type) && chart.cfg.type!='scatterchart') {
                this.reconfigureChart(chart);
            }
            else if (Ext.Array.contains(['outer'],type)) {
                this.reconfigureChart(chart);
            }
            else if (chart.cfg.attrs && chart.cfg.attrs.length && chart.cfg.attrs[0].normType=='select' && selCtrl.actualColor==selCtrl.defaultColor) {
                this.reconfigureChart(chart);
            }
            else if (type=='inner' && chart.cfg.type == 'extentoutline') {
                this.reconfigureChart(chart);
            }
            else if (Ext.Array.contains(['page','sort'],type) && Ext.Array.contains(['piechart','columnchart'],chart.cfg.type)) {
                this.reconfigureChart(chart);
            }
            else if (type == 'page' && chart.cfg.type == 'grid') {
                var store = chart.chart.store;
                Ext.apply(store.proxy.extraParams,this.getPagingParams());
                store.load();
            }
        }
    },
    reconfigureAll: function(justMap) {
        var charts = Ext.ComponentQuery.query('chartcmp');
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            this.reconfigureChart(chart, false);
        }
    },
    colourChart: function(chart) {
        if (!chart.chart || chart.cfg.type == 'featurecount')
            return;
        if (chart.cfg.type == 'grid') {
            try {
                chart.chart.getView().refresh();
            }
            // problems with refreshing empty grid
            catch(err) {}
            return;
        }
        if (!chart.chart.hasRendered || !chart.chart.series.length) {
            return;
        }
        var colorMap = chart.cfg.colorMap || this.getController('Select').colorMap;
        if (chart.cfg.type == 'piechart') {
            for (var i = 0; i < chart.chart.series.length; i++) {
                var serie = chart.chart.series[i];
                var at = serie.options.at;
                var gid = serie.options.gid;
                var loc = serie.options.loc
                var color = null;
                if (colorMap[loc] && colorMap[loc][at]) {
                    color = colorMap[loc][at][gid] ? ('#' + (colorMap[loc][at][gid])) : null;
                }
                var elem = serie.borderElem;
                if (color) {
                    if (!elem) {
                        var bbox = serie.group.getBBox();
                        var center = serie.userOptions.center;
                        var size = serie.userOptions.size
                        //elem = chart.chart.renderer.rect(bbox.x - 1, bbox.y + 37, bbox.width+4, bbox.height+4, 2)
                        elem = chart.chart.renderer.rect(center[0] - size / 2 + 8, center[1] - size / 2 + 18, size + 24, size + 24, 2)
                    }
                    elem.attr({
                        'stroke-width': 3,
                        stroke: color,
                        zIndex: 1
                    }).add();
                    //elem.toFront();
                    serie.borderElem = elem;
                }
                else {
                    if (elem) {
                        elem.destroy();
                    }
                    serie.borderElem = null;
                }

            }
        }
        if (chart.cfg.type == 'columnchart') {
            var data = chart.chart.series[0].data;
            var labels = chart.chart.xAxis[0].labelGroup.element.childNodes;
            for (var i = 0; i < data.length; i++) {
                var at = data[i].at;
                var gid = data[i].gid;
                var loc = data[i].loc
                var color = null;
                if (colorMap[loc] && colorMap[loc][at]) {
                    color = colorMap[loc][at][gid] ? ('#' + (colorMap[loc][at][gid])) : null;
                }
                var elem = data[i].borderElem;
                if (color) {
                    if (!elem) {
                        var bbox = labels[i].getBBox();
                        var elem = chart.chart.renderer.rect(bbox.x - 1, bbox.y + 1, bbox.width + 3, bbox.height - 1, 2)
                    }
                    elem.attr({
                        'stroke-width': 1,
                        stroke: color,
                        zIndex: 1
                    }).add();
                    data[i].borderElem = elem;
                }
                else {
                    if (elem) {
                        elem.destroy();
                    }
                    data[i].borderElem = null;
                }
            }

        }
        if (chart.cfg.type != 'scatterchart')
            return;
        var points = [];
        for (var i = 0; i < chart.chart.series.length; i++) {
            points = Ext.Array.merge(points, chart.chart.series[i].points);
        }

        var updated = false;
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            var at = point.at;
            var gid = point.gid;
            var loc = point.loc;
            var actualColor = point.graphic ? point.graphic.stroke.toLowerCase() : 1;
            if (colorMap[loc] && colorMap[loc][at]) {
                var color = '#' + (colorMap[loc][at][gid] || 'dddddd');
                color = color.toLowerCase();
            }
            else {
                color = '#dddddd';
            }
            if (color != actualColor) {
                updated = true;
                point.series.state = '';
                point.update({
                    lineColor: color,
                    lineWidth: color == '#dddddd' ? 1 : 3
                }, false)
            }
        }
        if (updated) {
            chart.chart.redraw();
        }
    },
    onAttrSetChange: function(combo, value) {
        var storeToFilterName = null;
        switch (combo.itemId) {
            case 'attributeSet':
                storeToFilterName = 'attribute4chart';
                break;
            case 'normAttributeSet':
                storeToFilterName = 'normattribute4chart';
                break;
        }
        var storeToFilterName = storeToFilterName || 'attribute4chart4norm';
        var attrSetStore = Ext.StoreMgr.lookup('attributeset');
        var attrSet = attrSetStore.getById(value);
        var attributes = attrSet.get('attributes');
        var storeToFilter = Ext.StoreMgr.lookup(storeToFilterName);
        storeToFilter.clearFilter(true);
        storeToFilter.filter([function(rec) {
                return Ext.Array.contains(attributes, rec.get('_id'));
            }])

    },
    onAddAttribute: function(btn) {
        var panel = btn.up('panel').up('panel')
        var attributeSet = Ext.ComponentQuery.query('#attributeSet', panel)[0].getValue();
        var grid = btn.up('grid');
        var sel = grid.getSelectionModel().getSelection();
        if (!sel || !sel.length)
            return;
        var recsToAdd = [];
        var normType = Ext.ComponentQuery.query('#normType', panel)[0].getValue();
        var normAttrSet = Ext.ComponentQuery.query('#normAttributeSet', panel)[0].getValue();
        var normGrid = Ext.ComponentQuery.query('#normselgrid', panel)[0];
        var normAttr = normGrid.getSelectionModel().getSelection()[0];
        if (Ext.Array.contains(['year', 'area'], normType)) {
            normAttrSet = null;
            normAttr = null;
        }
        else if (normType == 'attributeset' && normAttrSet) {
            normAttr = null
        }
        else if (normType == 'attribute' && normAttrSet && normAttr) {
                
        }
        else {
            normType = null;
            normAttrSet = null;
            normAttr = null;
        }
        for (var i = 0; i < sel.length; i++) {
            var attr = sel[i];
            var rec = Ext.create('Puma.model.MappedChartAttribute', {
                as: attributeSet,
                attr: attr.get('_id')
            })
            if (normType)
                rec.set('normType', normType);
            if (normAttrSet)
                rec.set('normAs', normAttrSet);
            if (normAttr)
                rec.set('normAttr', normAttr.get('_id'));
            recsToAdd.push(rec);
        }


        var addedGrid = Ext.ComponentQuery.query('#addedgrid', panel)[0]
        addedGrid.store.add(recsToAdd);

    },
    onRemoveAttribute: function(btn) {
        var grid = btn.up('grid');
        var sel = grid.getSelectionModel().getSelection();
        grid.store.remove(sel);
    }
});


