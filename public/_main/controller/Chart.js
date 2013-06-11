Ext.define('PumaMain.controller.Chart', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Ext.ux.grid.FiltersFeature', 'PumaMain.view.ChartConfig', 'PumaMain.view.Chart', 'PumaMain.view.VisualizationForm', 'Puma.util.Color'],
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
            'visualizationform form': {
                beforesave: this.onBeforeVisualizationSave,
                aftersave: this.onAfterVisualizationSave
            },
            'chartconfigpanel #attributeSet': {
                change: this.onAttrSetChange
            },
            'chartconfigpanel #showChoropleth': {
                change: this.onShowChoroplethChange
            },
            'chartconfigpanel #normalizationAttributeSet': {
                change: this.onAttrSetChange
            },
            'chartconfigpanel #addattrbtn': {
                click: this.onAddAttribute
            },
            'chartconfigpanel #removeattrbtn': {
                click: this.onRemoveAttribute
            },
            'chartconfigpanel #closebtn': {
                click: this.onWindowClose
            },
            'chartconfigpanel #addbtn': {
                click: this.onChartAdd
            },
            'chartconfigpanel #fillbtn': {
                click: this.onFillColors
            },
            'chartconfigpanel #reconfigurebtn': {
                click: this.onChartReconfigure
            },
            'chartconfigpanel #numCategories': {
                change: this.onNumCategoriesChange
            },
            'chartconfigpanel #classType': {
                change: this.onClassTypeChange
            },
            'chartconfigpanel #useAttributeColors': {
                change: this.onUseAttrColorsChange
            },
            'chartbar #removebtn': {
                click: this.onChartRemove
            },
            'chartbar #cfgbtn': {
                click: this.onReconfigureClick
            }}


        )

        Highcharts.setOptions({
            lang: {
                thousandsSep: ''
            }
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
            rec.set('color', color)
    }
    },
    onClassTypeChange: function(combo, val) {
        var grid = Ext.ComponentQuery.query('chartconfigpanel #classgrid')[0];
        grid.columns[2].setVisible(val == 'range');
    },
    onUseAttrColorsChange: function(chb, val) {
        var grid = Ext.ComponentQuery.query('chartconfigpanel #classgrid')[0]
        grid.columns[1].setVisible(val ? false : true)
    },
    onNumCategoriesChange: function(combo, val) {
        var store = Ext.ComponentQuery.query('chartconfigpanel #classgrid')[0].store;
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
    onShowChoroplethChange: function(chb, val) {
        var container = chb.up('container');
        var disabled = val ? false : true;
        var choroItems = Ext.ComponentQuery.query('component[forChoro=1]', container);
        for (var i = 0; i < choroItems.length; i++) {
            choroItems[i].setDisabled(disabled);
        }
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
        var treeBtns = Ext.ComponentQuery.query('initialbar #treecontainer button');
        var trees = Ext.Array.pluck(treeBtns, 'objId');
        if (!theme || !trees.length)
            return;

        var visualizationStore = Ext.StoreMgr.lookup('visualization4window');
        visualizationStore.clearFilter(true);
        visualizationStore.filter([function(rec) {
                return rec.get('theme') == theme;
            }])
        var areaStore = Ext.StoreMgr.lookup('areas4visualization');
        areaStore.clearFilter(true);
        areaStore.filter([function(rec) {
                return Ext.Array.contains(trees, rec.get('_id'));
            }])
        var window = Ext.WindowManager.get('visualizationwindow');
        window = window || Ext.widget('window', {
            layout: 'fit',
            id: 'visualizationwindow',
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
            rec.set('cfg', cfg);
        }
    },
    gatherCfg: function() {
        var charts = Ext.ComponentQuery.query('chartcmp');
        var cfg = [];
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            cfg.push(chart.cfg);
        }
        return cfg;
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
        var vis = store.getById(visId);
        var cfg = vis ? vis.get('cfg') : [];
        var container = Ext.ComponentQuery.query('chartbar')[0];
        var me = this;
        container.items.each(function(item) {
            me.onChartRemove(null, item);
        })
        for (var i = 0; i < cfg.length; i++) {

            this.addChart(cfg[i], true);
        }

    },
    onChartAdd: function(btn) {
        var form = btn.up('chartconfigpanel');
        var cfg = form.getForm().getValues();
        var color = form.down('colorpicker');
        var val = color.getValue();
        cfg.selColor = Array.isArray(val) ? val : [val];
        this.addChart(cfg);




    },
    addChart: function(cfg, withoutReconfigure) {
        var container = Ext.ComponentQuery.query('chartbar')[0];
        var opts = cfg.type == 'featurecount' ? {height: 150} : {}
        var chart = Ext.widget('chartcmp', opts);

        var me = this;
        var cnt = Ext.widget('panel', {
            layout: 'fit',
            frame: false,
            margin: '10 10 10 0',
            border: 0,
            padding: 0,
            buttons: [{
                    text: 'Remove',
                    itemId: 'removebtn'
                }, {
                    text: 'Config',
                    itemId: 'cfgbtn'
                }, {
                    text: 'Legend',
                    hidden: Ext.Array.contains(['grid', 'featurecount'], cfg.type),
                    pressed: false,
                    scope: chart,
                    enableToggle: true,
                    itemId: 'legendbtn',
                    handler: function(btn) {
                        var chart = this.chart;
                        if (!chart)
                            return;
                        me.toggleLegendState(chart, btn.pressed);
                    }
                },
                {
                    text: 'Export',
                    hidden: cfg.type != 'grid',
                    scope: chart,
                    itemId: 'exportbtn',
                    handler: function(btn) {
                        me.reconfigureChart(this, true)
                    }
                }],
            items: [chart]
        })
        container.add(cnt);
        chart.cfg = cfg;
        if (!withoutReconfigure) {
            this.reconfigureChart(chart);
        }
    },
    onChartRemove: function(btn, panel) {
        var panel = btn ? btn.up('panel') : panel;

        this.getController('Layers').onChartReconfigure(panel.items.getAt(0), {removing: true});
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
        var color = form.down('colorpicker');
        var val = color.getValue();
        cfg.selColor = Array.isArray(val) ? val : [val];
        form.chart.cfg = cfg;
        this.reconfigureChart(form.chart);
    },
    getChartWindowConfig: function(chart, reconfiguring) {
        var themeBtn = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0];
        var theme = Ext.StoreMgr.lookup('theme').getById(themeBtn.objId);
        var areaTemplates = theme.get('areaTemplates');
        var store = Ext.create('Gisatlib.data.SlaveStore', {
            slave: true,
            filters: [function(rec) {
                    return Ext.Array.contains(areaTemplates, rec.get('_id'));
                }],
            autoLoad: true,
            model: 'Puma.model.AreaTemplate'
        })
        var cfg = {
            layout: 'fit',
            items: [{
                    xtype: 'chartconfigpanel',
                    areaTemplateStore: store,
                    chart: chart,
                    reconfiguring: reconfiguring
                }]
        }
        if (!reconfiguring) {
            cfg['closeAction'] = 'hide'
            cfg['id'] = 'newchartconfig'
        }
        return cfg;
    },
    onReconfigureClick: function(btn) {
        var chart = btn.up('panel').down('chartcmp');
        var cfg = this.getChartWindowConfig(chart, true);
        var window = Ext.widget('window', cfg)
        window.down('chartconfigpanel').getForm().setValues(chart.cfg);
        window.show();
    },
    reconfigureChart: function(chartCmp, forExport,justMap) {
        var cfg = chartCmp.cfg;
        var queryCfg = Ext.clone(cfg);
        var configColor = Ext.ComponentQuery.query('chartconfigpanel #selColor')[0]
        if (configColor) configColor.select(cfg.selColor);
        var location = Ext.Ajax.extraParams ? Ext.Ajax.extraParams['location'] : null;
        if (!location)
            return;

        var areas = {};
        if (cfg.areas == 'select') {
            var colors = cfg.selColor;
            var selMaps = [];
            var selMap = this.getController('Select').selMap;
            var map = {};
            var empty = true;
            for (var i = 0; i < colors.length; i++) {
                var actualMap = selMap[colors[i]];
                if (actualMap && actualMap.length) {
                    empty = false;
                    selMaps.push(actualMap);
                }

            }
            if (empty) {
                if (cfg.areaTemplate) {

                    areas[location] = {};
                    areas[location][cfg.areaTemplate] = true;
                }
                else {
                    return;
                }
            }
            else {
                for (var i = 0; i < selMaps.length; i++) {
                    var selMap = selMaps[i];
                    for (var j = 0; j < selMap.length; j++) {
                        var at = selMap[j].at;
                        var gid = selMap[j].gid;
                        map[at] = map[at] || [];
                        map[at].push(gid);
                    }
                }
                areas[location] = map;

            }

        }
        else {
            var areaController = this.getController('Area');
            if (cfg.areas == 'areatemplate') {
                if (cfg.areaTemplate) {
                    areas[location] = {};
                    areas[location][cfg.areaTemplate] = true;
                }
                else {
                    return;
                }
            }
            else {
                var map = cfg.areas == 'treeall' ? areaController.allMap : areaController.lowestMap;
                var areas = {}
                areas[location] = map;
            }
        }
        queryCfg.areas = areas;
        if (cfg.useMaster == 'on') {
            var yearBtn = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0];
            if (!yearBtn)
                return;
            queryCfg.years = [yearBtn.objId];
        }
        var params = {};
        var keysToJson = ['areas', 'attrs', 'years', 'classConfig'];
        if (!queryCfg.years) {
            queryCfg.years = [];
        }
        if (!queryCfg.years.length) {
            queryCfg.years = [queryCfg.years]
        }
        for (var key in queryCfg) {
            if (Ext.Array.contains(keysToJson, key)) {
                params[key] = JSON.stringify(queryCfg[key])
            }
            else {
                params[key] = queryCfg[key]
            }
        }
        chartCmp.queryCfg = queryCfg;
        if (!Ext.Ajax.extraParams || !Ext.Ajax.extraParams['location']) {
            params['location'] = location;
        }
        if (forExport) {
            var store = chartCmp.chart.store;
            store.on('beforeload', function(st, operation) {
                Ext.applyIf(params, store.proxy.getParams(operation));
                var filterFeature = chartCmp.chart.filters;
                var filterParams = filterFeature.buildQuery(filterFeature.getFilterData());
                Ext.apply(params, filterParams);
                console.log(params)
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
                    url: Cnst.url + '/api/chart/getGridDataCsv',
                    success: function() {
                    },
                    failure: function() {
                    }
                });
                return false;
            }, true, {single: true})
            chartCmp.chart.view.loadMask.disabled = true;
            store.load();
            chartCmp.chart.view.loadMask.disabled = false;
            return;
        }

        Ext.Ajax.request({
            url: Cnst.url + '/api/chart/getChart',
            params: params,
            scope: this,
            method: 'GET',
            cmp: chartCmp,
            success: forExport ? null : this.onChartReceived,
            failure: forExport ? null : this.onChartReceived
        })
        this.getController('Layers').onChartReconfigure(chartCmp, params);
    },
    onChartReceived: function(response) {
        var cmp = response.request.options.cmp;
        if (cmp.chart) {
            try {
                cmp.chart.destroy();
            }
            catch (e) {
            }
        }

        var legendBtn = Ext.ComponentQuery.query('#legendbtn', cmp.ownerCt)[0];
        var data = JSON.parse(response.responseText).data;
        if (!data) {
            legendBtn.hide();
            return;
        }
        if (data.noData) {
            data.chart.renderTo = cmp.el.dom;
            var chart = new Highcharts.Chart(data);
            cmp.chart = chart;
            chart.cmp = cmp;

            legendBtn.hide();
            return;
        }
        if (!Ext.Array.contains(['grid', 'featurecount'], cmp.cfg.type)) {
            legendBtn.show();
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

        data.plotOptions = data.plotOptions || {series: {events: {}}}

        data.plotOptions.series.events.click = function(evt) {
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
            if (cmp.cfg.type == 'scatterchart' && cmp.cfg.years && cmp.cfg.years.length > 1) {
                data.plotOptions.series.point.events.mouseOut = function(evt) {
                    $('path[linecls=1]').hide();
                }
            }
        }

        if (cmp.cfg.type == 'piechart') {
            data.plotOptions.pie.point.events.legendItemClick = function(evt) {
                evt.preventDefault();
                me.onLegendToggle(this)
            }
        }
        data.chart.renderTo = cmp.el.dom;

        var chart = new Highcharts.Chart(data);
        cmp.chart = chart;
        chart.cmp = cmp;
        var panel = cmp.ownerCt;
        var btn = Ext.ComponentQuery.query('#legendbtn', panel)[0];
        me.toggleLegendState(chart, btn.pressed);
        this.colourChart(cmp);

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

        if (hovering && !this.hovering && (cmp.cfg.type != 'scatterchart' || !cmp.cfg.years || cmp.cfg.years.length < 2))
            return;
        var at = null;
        var gid = null;
        if (cmp.cfg.type == 'piechart') {
            var serie = hovering ? evt.target : evt.point.series;
            at = serie.options.at;
            gid = serie.options.gid;
        }
        else {
            var point = evt.point || evt.target;
            at = point ? point.at : null;
            gid = point ? point.gid : null;
        }
        if (!at || !gid)
            return;
        if (hovering && cmp.cfg.type == 'scatterchart' && cmp.cfg.years && cmp.cfg.years.length > 1) {
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
                    if (point.at == iterPoint.at && point.gid == iterPoint.gid) {
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
        var areas = [{at: at, gid: gid}]
        var add = evt.originalEvent ? evt.originalEvent.ctrlKey : evt.ctrlKey;
        this.getController('Select').select(areas, add, hovering);
        evt.preventDefault();
    },
    onScatterSelected: function(evt) {
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
                var atGid = point.at + '_' + point.gid;
                if (!Ext.Array.contains(atGids, atGid)) {
                    areas.push({at: point.at, gid: point.gid});
                    atGids.push(atGid)
                }
            }
        }
        var add = evt.originalEvent.ctrlKey;
        this.getController('Select').select(areas, add, false);
        evt.preventDefault();
    },
    onGridReceived: function(response) {
        var data = JSON.parse(response.responseText).data;
        var cmp = response.request.options.cmp;
        var store = Ext.create('Ext.data.Store', {
            fields: data.fields,
            autoLoad: true,
            remoteFilter: true,
            remoteSort: true,
            pageSize: 14,
            proxy: {
                type: 'ajax',
                reader: {
                    type: 'json',
                    root: 'data'
                },
                url: Cnst.url + '/api/chart/getGridData',
                extraParams: response.request.options.params
            }
        });

        var filters = {
            ftype: 'filters',
            encode: true,
            local: false
        };
        var selectController = this.getController('Select');
        var grid = Ext.widget('grid', {
            renderTo: cmp.el,
            store: store,
            height: 392,
            title: cmp.cfg.title,
            //frame: true,
            //padding: 10,
            features: [filters],
            viewConfig: {
                getRowClass: function(record, rowIndex, rowParams, store) {
                    var colorMap = selectController.colorMap;
                    var at = record.get('at');
                    var gid = record.get('gid');
                    var color = '';
                    if (colorMap[at]) {
                        color = colorMap[at][gid] || '';
                    }
                    return color ? ('select_' + color) : ''
                }
            },
            dockedItems: [Ext.create('Ext.toolbar.Paging', {
                    dock: 'bottom',
                    store: store
                })],
            columns: data.columns
        })
        cmp.chart = grid;
        cmp.relayEvents(grid, ['beforeselect', 'itemclick', 'itemmouseenter'])
    },
    reconfigure: function(bySelect) {
        var charts = Ext.ComponentQuery.query('chartcmp');
        var selController = this.getController('Select');
        var actualColor = selController.actualColor;
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            var areas = chart.cfg.areas;
            if (areas == 'select' && Ext.Array.contains(chart.cfg.selColor, actualColor) && bySelect) {
                this.reconfigureChart(chart);
            }
            else if (bySelect) {
                this.colourChart(chart);
            }
            if (areas != 'select' && !bySelect) {
                this.reconfigureChart(chart);
            }
        }
    },
    reconfigureAll: function(justMap) {
        var charts = Ext.ComponentQuery.query('chartcmp');
        for (var i = 0; i < charts.length; i++) {
            var chart = charts[i];
            this.reconfigureChart(chart,false,justMap);
        }
    },
    colourChart: function(chart) {
        if (!chart.chart || chart.cfg.type == 'featurecount')
            return;
        if (chart.cfg.type == 'grid') {
            chart.chart.getView().refresh();
            return;
        }
        if (!chart.chart.hasRendered) {
            return;
        }
        var colorMap = this.getController('Select').colorMap;
        if (chart.cfg.type == 'piechart') {
            for (var i = 0; i < chart.chart.series.length; i++) {
                var serie = chart.chart.series[i];
                var at = serie.options.at;
                var gid = serie.options.gid;
                var color = null;
                if (colorMap[at]) {
                    color = colorMap[at][gid] ? ('#' + (colorMap[at][gid])) : null;
                }
                var elem = serie.borderElem;
                if (color) {
                    if (!elem) {
                        var bbox = serie.group.getBBox();
                        var center = serie.userOptions.center;
                        var size = serie.userOptions.size
                        //elem = chart.chart.renderer.rect(bbox.x - 1, bbox.y + 37, bbox.width+4, bbox.height+4, 2)
                        elem = chart.chart.renderer.rect(center[0] - size / 2 + 8, center[1] - size / 2 + 48, size + 24, size + 24, 2)
                    }
                    elem.attr({
                        'stroke-width': 3,
                        stroke: color,
                        zIndex: 1
                    }).add();
                    elem.toFront();
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
                var color = null;
                if (colorMap[at]) {
                    color = colorMap[at][gid] ? ('#' + (colorMap[at][gid])) : null;
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
            var actualColor = point.graphic ? point.graphic.stroke.toLowerCase() : 1;
            if (colorMap[at]) {
                var color = '#' + (colorMap[at][gid] || 'dddddd');
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
        var storeToFilterName = combo.itemId == 'attributeSet' ? 'attribute4chart' : 'attribute4chart4norm';
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
        var attributeSet = Ext.ComponentQuery.query('chartconfigpanel #attributeSet')[0].getValue();
        var grid = btn.up('grid');
        var sel = grid.getSelectionModel().getSelection();
        if (!sel || !sel.length)
            return;
        var recsToAdd = [];
        for (var i = 0; i < sel.length; i++) {
            var attr = sel[i];
            var rec = Ext.create('Puma.model.MappedChartAttribute', {
                as: attributeSet,
                attr: attr.get('_id')
            })
            recsToAdd.push(rec);
        }
        var addedGrid = Ext.ComponentQuery.query('chartconfigpanel #addedgrid')[0]
        addedGrid.store.add(recsToAdd);

    },
    onRemoveAttribute: function(btn) {
        var grid = btn.up('grid');
        var sel = grid.getSelectionModel().getSelection();
        grid.store.remove(sel);
    },
    onChartBtnClick: function() {
        var window = Ext.WindowManager.get('newchartconfig');
        if (window) {
            var store = window.down('chartconfigpanel').areaTemplateStore;
            var themeBtn = Ext.ComponentQuery.query('initialbar #themecontainer button[pressed=true]')[0];
            var theme = Ext.StoreMgr.lookup('theme').getById(themeBtn.objId);
            var areaTemplates = theme.get('areaTemplates');
            store.clearFilter(true);
            store.filter([function(rec) {
                    return Ext.Array.contains(areaTemplates, rec.get('_id'));
                }])
        }
        var cfg = this.getChartWindowConfig(null, false)
        window = window || Ext.widget('window', cfg)
        window.show();
    },
    onWindowClose: function(btn) {
        btn.up('window').close();
    },
});


