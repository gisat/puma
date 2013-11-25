Ext.define('PumaMain.controller.Filter', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    '#advancedfilters multislider' : {
                        changecomplete: this.applyFilters,
                        change: this.onFilterChange,
                        dragstart: this.onFilterDragStart,
                        dragend: this.onFilterDragEnd
                    },
                    '#advancedfilters #instantfilter' : {
                        toggle: this.onInstantChange
                    },
                    '#advancedfilters #filterselect' : {
                        click: this.onSelectFilter
                    },
                    'toolspanel': {
                        afterlayout: this.afterAccordionLayout
                    }
                })
    },
        
    afterAccordionLayout: function() {
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var value = slider.getValue();
            this.onFilterChange(slider,value[0],slider.thumbs[0]);
            this.onFilterChange(slider,value[1],slider.thumbs[1]);
        }
    },
    
    onFilterChange: function(slider,value,thumb) {
        var id = slider.thumbs[0]==thumb ? 'thumb1' : 'thumb2';
        var label = slider.up('container').down('#'+id);
        var labelEl = label.el;
        if (!labelEl) return;
        labelEl.setHTML(value);
        labelEl.alignTo(thumb.el,"b-t",[0,0]);
        if (slider.chartEl) {
            
            slider.chartEl.alignTo(slider.el,"b-t",[0,0]);
            var points = slider.chart.series[0].data;
            var value = slider.getValue();
            var diff = slider.maxValue-slider.minValue;
            var inc = diff/points.length;
            
            for (var i=0;i<points.length;i++) {
                var point = points[i];
                var hypoMin = slider.minValue + i*inc;
                var hypoMax = slider.minValue + i*inc + inc;
                var toSelect = (hypoMax>value[0] && hypoMin<value[1]);
                point.select(toSelect,toSelect);
                console.log(point,i,toSelect)
            }
            
            
        }
    },
    
    onFilterDragStart: function(slider,value,thumb) {
        var id = slider.thumbs[0]==thumb ? 'thumb1' : 'thumb2';
        var label = slider.up('container').down('#'+id);
        var labelEl = label.el;
        if (!labelEl) return;
        labelEl.addCls('sliding');
        if (slider.chartEl) {
            
            slider.chartEl.show();
        }
        
        
        
    },
    
    onFilterDragEnd: function(slider,value,thumb) {
        var label1 = slider.up('container').down('#thumb1');
        var label1El = label1.el;
        var label2 = slider.up('container').down('#thumb2');
        var label2El = label2.el;
        if (!label1El || !label2El) return;
        label1El.removeCls('sliding');
        label2El.removeCls('sliding');
        if (slider.chartEl) {
            
            slider.chartEl.hide();
        }
    },
    
    
    onInstantChange: function(btn) {
        if (btn.eventsSuspended) return;
        var filterSelect = Ext.ComponentQuery.query('#advancedfilters #filterselect')[0];
        filterSelect.setDisabled(btn.pressed);
        if (!btn.pressed) {
            var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
             for (var i=0;i<sliders.length;i++) {
                var slider = sliders[i];
                slider.setValue([slider.minValue,slider.maxValue],false)    
             }
        }
        this.applyFilters(null,true);
    },
        
    onSelectFilter: function() {
        this.applyFilters(null,true,true)
    },
    
    applyFilters: function(withoutRefresh,bypassInstant,bySelectFilter) {
        
        var instantFilter = Ext.ComponentQuery.query('#instantfilter')[0].pressed
        if (!instantFilter && bypassInstant!==true) return;
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        var areaController = this.getController('Area');
        var filters = [];
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var obj = Ext.clone(slider.attrObj);
            var val = slider.getValue();
            obj.min = val[0]/slider.multiplier;
            obj.max = val[1]/slider.multiplier;
            filters.push(obj);
        }
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var dataset = Ext.StoreMgr.lookup('dataset').getById(datasetId);
        var featureLayers = dataset.get('featureLayers');
        var atMap = {};
        for (var i=this.minFl;i<=this.maxFl;i++) {
            atMap[featureLayers[i]] = true;
        }
        if (!filters.length) {
            areaController.areaFilter = null;
        }
        else {
            areaController.areaFilter = {
                areaTemplates: atMap,
                filters: filters
            }
        }
        if (withoutRefresh!==true) {
            var itemId = bySelectFilter === true ? 'selectfilter' : 'filter'
            this.getController('LocationTheme').onYearChange({itemId:itemId});
        }
    },
    
    reconfigureFilters: function(cfg) {
        var attrs = Ext.clone(cfg.attrs);
        this.cfg = cfg;
        var filterPanel = Ext.ComponentQuery.query('#advancedfilters')[0];
        var sliders = Ext.ComponentQuery.query('multislider',filterPanel);
        
        for (var i = 0; i < sliders.length; i++) {
            var slider = sliders[i];
            var found = false;
            var attr = null;
            for (var j = 0; j < attrs.length; j++) {
                attr = attrs[j];
                if (slider.attrObj.as == attr.as && slider.attrObj.attr == attr.attr) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                filterPanel.remove(slider.up('container'));
            }
            else {
                Ext.Array.remove(attrs, attr);
            }
        }
        
        
        var attrMap = {};
        var attrsToRemove = [];
        for (var i=0;i<attrs.length;i++) {
            var attr = attrs[i];
            if (attrMap[attr.as+'_'+attr.attr]) {
                attrsToRemove.push(attr);
            }
            attrMap[attr.as+'_'+attr.attr] = true;
        }
        this.attrs = Ext.Array.difference(attrs,attrsToRemove);
        
        if (!attrs.length) {
            return;
        }
        this.reconfigureFiltersCall(false,true);
        
        
    },
    
    createChart: function(slider,dist) {
        if (slider.chartEl) {
            slider.chartEl.hide();
        }
        var cmp = Ext.create('Ext.Component',{
            width: 200,
            height: 150,
            floating: true
        })
        cmp.show();
        cmp.hide();
        var chart = new Highcharts.Chart({
            chart: {
                renderTo: cmp.el.dom,
                type: 'column',
                events: {
                    load: function(event) {
//                        this.series[0].data[3].select(true,true);
//                        this.series[0].data[4].select(true,true);
//                        this.series[0].data[5].select(true,true);
                    }
            }        
            },
            yAxis: {
                min: 0,
                title: null,
                allowDecimals: false,
                 labels: {
                    enabled: false
                }
            },
            xAxis: {
                labels: {
                    enabled: false
                },
                tickLength: 0
            },
            credits: {
                enabled: false
            },
            exporting: {
                enabled: false
            },
            legend: {
                enabled: false
            },
            title: {
                text: null
            },
            plotOptions: {
                column: {
                    pointPadding: 0,
                    groupPadding: 0.1,
                    borderWidth: 0
                }
            },
            series: [{
                data: Ext.Array.clone(dist),
                color: '#ccc',
                states: {
                    select: {
                        color: '#aaaaff'
                    }
                }
            }]
        
        });
        slider.chartEl = cmp.el;
        slider.chart = chart;
    },
    
        
    reconfigureFiltersCall: function(requestData,requestDist) {
        if (!this.attrs || !this.attrs.length) return;
        var areas = this.getController('Area').allMap;
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var years = [Ext.ComponentQuery.query('#selyear')[0].getValue()[0]];
        var params = {
            dataset: datasetId,
            years: JSON.stringify(years),
        }
        if (requestDist) {
            params.attrs = JSON.stringify(this.attrs)
            params.areas = JSON.stringify(areas);
        }
        if (requestData) {
            
        }
        Ext.Ajax.request({
            url: Config.url + '/api/filter/filter',
            params: params,
            scope: this,
            method: 'GET',
            success: this.reconfigureFiltersCallback
        })
    },    
        
    reconfigureFiltersCallback: function(response) {
        var attrMap = JSON.parse(response.responseText).data.metaData;
        var selMap = JSON.parse(response.responseText).data.data;
        if (attrMap) {
            this.updateDistributions(attrMap);
        }
        if (selMap) {
            
        }
    },
        
    updateDistributions: function(attrMap) {
        var filterPanel = Ext.ComponentQuery.query('#advancedfilters')[0];
        var attrCfgs = [];
        for (var i = 0; i < this.attrs.length; i++) {
            var attr = this.attrs[i]
            var idx = Ext.Array.indexOf(this.attrs, attr);
            var attrName = 'as_'+attr.as+'_attr_'+attr.attr
            if (Ext.Array.contains(attrCfgs,attrName)) {
                continue;
            }
            
            attrCfgs.push(attrName);
            
            var attrCfg = attrMap[attrName];
            
            attrCfg.attrObj = attr;
            attrCfg.attrName = attrName;
            
            var slider = Ext.ComponentQuery.query('multislider[attrname='+attrName+']')[0];
            
            if (slider) {
                this.updateSlider(slider,attrCfg);
                this.createChart(slider,attrCfg.dist);
            }
            else {
                
                var cnt = this.getFilterItems([attrCfg])[0]
                filterPanel.insert(idx, cnt);
                slider = Ext.ComponentQuery.query('multislider[attrname='+attrName+']')[0];
                this.createChart(slider,attrCfg.dist);
            }
            
        }
    },
        
    updateSlider: function(slider,cfg) {
        var container = slider.up('container');
        var attrName = cfg.attrObj.attrName + ' ('+cfg.units+')';
        slider.decimalPrecision = Math.max(0,-cfg.decimal);
        slider.increment = Math.pow(10,cfg.decimal);
        slider.setMinValue(cfg.min);
        slider.setMaxValue(cfg.max);
        
        container.down('#attrName').setValue(attrName);
        container.down('#minValue').el.setHTML(String(cfg.min))
        container.down('#maxValue').el.setHTML(String(cfg.max))
    },
        
    getFilterItems: function(attrCfgs) {
        var items = [];
        
        for (var i = 0; i < attrCfgs.length; i++) {
            var attrCfg = attrCfgs[i];
            var min = attrCfg.value ? attrCfg.value[0] : attrCfg.min;
            var max = attrCfg.value ? attrCfg.value[1] : attrCfg.max;
            var cnt = {
                xtype: 'container',
                margin: 0,
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [{
                        xtype: 'displayfield',
                        itemId: 'attrName',
                        margin: '0 17',
                        value: attrCfg.attrObj.attrName + ' ('+attrCfg.units+')'
                    }, {
                        xtype: 'container',
                        suspendLayout: true,
                        layout: {
                            type: 'hbox'
                        },
                        items: [{
                            xtype: 'component',
                            itemId: 'thumb1',
                            cls: 'slider-thumb-label',
                            html: min
                        },{
                            xtype: 'component',
                            itemId: 'thumb2',
                            cls: 'slider-thumb-label',
                            html: max
                        }]
                    },
                    {
                        xtype: 'multislider',
                        
                        attrname: attrCfg.attrName,
                        useTips: false,
                        margin: '0 17',
                        clickToChange: false,
                        values: [min,max],
                        attrObj: attrCfg.attrObj,
                        //increment: attrCfg.inc,
                        units: attrCfg.units,
                        //minValue: attrCfg.min*attrCfg.multiplier,
                        //maxValue: attrCfg.max*attrCfg.multiplier,
                        
                        minValue: min,
                        maxValue: max,
                        decimalPrecision: Math.max(0,-attrCfg.decimal),
                        increment: Math.pow(10,attrCfg.decimal),
                        constrainThumbs: true
                    },{
                        xtype: 'container',
                        margin: '0 17',
                        layout: {
                            type: 'hbox'
                        },
                        items: [{
                            xtype: 'container',
                            flex: 1,
                            items: [{itemId: 'minValue',xtype: 'component',cls: 'slider-constraints slider-constraint-min',html: String(attrCfg.min)}],
                            layout: {
                                type: 'hbox',
                                pack: 'start'
                            }
                        },{
                            xtype: 'container',
                            flex: 1,
                            items: [{itemId: 'maxValue',xtype: 'component',cls: 'slider-constraints slider-constraint-max',html: String(attrCfg.max)}],
                            layout: {
                                type: 'hbox',
                                pack: 'end'
                            }
                        }]
                    }]
            }
            items.push(cnt)
        }
        return items;


    }
    
})



