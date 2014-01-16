Ext.define('PumaMain.controller.Filter', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Puma.util.Msg'],
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
                    '#advancedfilters' : {
                        resize: this.afterAccordionLayout
                    },
                    '#advancedfilters #minValue' : {
                        afterrender: this.onAfterValueRender
                    },
                    '#advancedfilters #maxValue' : {
                        afterrender: this.onAfterValueRender
                    },
                    '#advancedfilters tool[type=poweron]': {
                        click: this.changeActiveState
                    },
                    '#advancedfilters tool[type=refresh]': {
                        click: this.onResetFilters
                    },
                    '#advancedfilters tool[type=gear]': {
                        click: this.onConfigure
                    },
                    'toolspanel': {
                        afterlayout: this.afterAccordionLayout
                    }
                })
    },
        
    onAfterValueRender: function(obj) {
        if (obj.cfgVal) {
            obj.el.setHTML(obj.cfgVal);
        }
    },
        
    onResetFilters: function(btn) {
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            slider.setValue([slider.minValue,slider.maxValue]);
            
        }
        
        
    },
    onConfigure: function() {
        this.getController('AttributeConfig').onConfigureClick({itemId:'configurefilters'});
    },
        
    afterAccordionLayout: function(slider) {
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        if (slider && slider.xtype=='multislider') {
            sliders = [slider];
        }
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var value = slider.getValue();
            this.onFilterChange(slider,value[0],slider.thumbs[0]);
            this.onFilterChange(slider,value[1],slider.thumbs[1]);
        }
    },
    
    onFilterChange: function(slider,value,thumb) {
        var isFirst = slider.thumbs[0]==thumb
        var id =  isFirst ? 'thumb1' : 'thumb2';
        var label = slider.up('container').down('#'+id);
        var labelEl = label.el;
        if (!labelEl) return;
        labelEl.setHTML(value);
        var offset = 0;
        
        labelEl.alignTo(thumb.el,"b-t",[0,0]);
        if (isFirst && labelEl.dom.offsetLeft<2) {
            offset = 2 - labelEl.dom.offsetLeft
        }
        else if (labelEl.dom.offsetParent && labelEl.dom.offsetLeft+labelEl.dom.offsetWidth>labelEl.dom.offsetParent.offsetWidth-2){
            offset = -(labelEl.dom.offsetLeft+labelEl.dom.offsetWidth-labelEl.dom.offsetParent.offsetWidth+2);
        }
        if (offset) {
            labelEl.alignTo(thumb.el,"b-t",[offset,0]);   
        }
        if (slider.chartEl) {
            
            slider.chartEl.alignTo(slider.el,"b-t",[0,-20]);
            var points = slider.chart.series[0].data;
            var value = slider.getValue();
            var diff = slider.maxValue-slider.minValue;
            var inc = diff/points.length;
            var sum = 0;
            var approx = 0;
            for (var i=0;i<points.length;i++) {
                var point = points[i];
                
                var hypoMin = slider.minValue + i*inc;
                var hypoMax = slider.minValue + i*inc + inc;
                var toSelect = (hypoMax>value[0] && hypoMin<value[1]);
                sum += point.y;
                if (toSelect) {
                    approx += point.y;
                }
                
                point.select(toSelect,true);
            }
            var span = Ext.query('svg .highcharts-axis tspan',slider.chart.renderTo)[0];
            var text = 'approx. '+approx+'/'+sum;
            if (span.textContent!=null) {
                span.textContent = text;
            }
            else {
                span.innerText = text;
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
            
            slider.chartEl.setDisplayed('');
            slider.chartEl.setStyle({visibility:'visible',zIndex:100000});
            slider.chartEl.down('text').setStyle({visibility:'visible'})
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
            
            slider.chartEl.setDisplayed('none');
            slider.chartEl.setStyle({visibility:'hidden'});
            slider.chartEl.down('text').setStyle({visibility:'hidden'})
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
    
    applyFilters: function() {
        if (!this.filterActive) return;
//        var instantFilter = Ext.ComponentQuery.query('#instantfilter')[0].pressed
//        if (!instantFilter && bypassInstant!==true) return;
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        var filters = [];
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var obj = Ext.clone(slider.attrObj);
            var val = slider.getValue();
            obj.min = val[0]==slider.minValue ? val[0]-0.1 : val[0];
            obj.max = val[1]==slider.maxValue ? val[1]+0.1 : val[1];
            filters.push(obj);
        }
        this.reconfigureFiltersCall(filters);
        
//        var dataset = Ext.ComponentQuery.query('#seldataset')[0].getValue();
//        var years = Ext.ComponentQuery.query('#selyear')[0].getValue();
//        var params = {
//                years: JSON.stringify(years),
//                dataset: dataset
//            }
//        var expandedAndFids = this.getController('Area').getExpandedAndFids();
//        params['expanded'] = JSON.stringify(expandedAndFids.expanded);
//        params['filter'] = JSON.stringify({
//            filters: filters,
//            areaTemplates: []
//        })
//        Ext.Ajax.request({
//            url: Config.url + '/api/filter/filter',
//            params: params,
//            scope: this,
//            method: 'GET',
//            success: this.applyFiltersCallback
//        })
        
        this.getController('DomManipulation').activateLoadingMask();
//        var featureLayers = dataset.get('featureLayers');
//        var atMap = {};
//        for (var i=this.minFl;i<=this.maxFl;i++) {
//            atMap[featureLayers[i]] = true;
//        }
//        if (!filters.length) {
//            areaController.areaFilter = null;
//        }
//        else {
//            areaController.areaFilter = {
//                areaTemplates: atMap,
//                filters: filters
//            }
//        }
//        if (withoutRefresh!==true) {
//            var itemId = bySelectFilter === true ? 'selectfilter' : 'filter'
//            this.getController('LocationTheme').onYearChange({itemId:itemId});
//        }
    },
    
    clearFilters: function() {
        this.attrs = [];
        this.cfg = null;
        this.getController('AttributeConfig').filterConfig = null;
        var panel = Ext.ComponentQuery.query('#advancedfilters')[0];
        panel.removeAll();
    },
    
    reconfigureFilters: function(cfg) {
        var attrs = Ext.Array.clone(cfg.attrs);
        var oldAttrs = Ext.Array.clone(cfg.attrs);
        this.cfg = cfg;
        var filterPanel = Ext.ComponentQuery.query('#advancedfilters')[0];
        var sliders = Ext.ComponentQuery.query('multislider',filterPanel);
        
        for (var i = 0; i < sliders.length; i++) {
            var slider = sliders[i];
            var found = false;
            var attr = null;
            for (var j = 0; j < attrs.length; j++) {
                attr = attrs[j];
                
                if (slider.attrObj.as == attr.as && slider.attrObj.attr == attr.attr && slider.attrObj.normType==attr.normType && slider.attrObj.normAs == attr.normAs && slider.attrObj.normAttr == attr.normAttr) {
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
        attrs = Ext.Array.difference(attrs,attrsToRemove);
        this.attrs = cfg.attrs;
        if (!attrs.length) {
            this.changeActiveState(false);
            return;
        }
        this.changeActiveState(true);
        this.reconfigureFiltersCall(false,true);
        
        
    },
    
    createChart: function(slider,dist) {
        if (slider.chartEl) {
            slider.chartEl.hide();
        }
        var cmp = Ext.create('Ext.Component',{
            width: 200,
            height: 150,
            border: 2,
            style: {
                borderColor: '#ddd',
                zIndex: 100000,
                backgroundColor: '#fff',
                //borderRadius: '8px',
                borderStyle: 'solid'
            },
            floating: true
        })
        cmp.show();
        cmp.hide();
        var chart = new Highcharts.Chart({
            chart: {
                renderTo: cmp.el.dom,
                type: 'column'    
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
                title: {
                    text: 'approx.',
                    
                    offset: -120,
                    style: {
                        fontSize: 10,
                        fontWeight: 'normal',
                        color: '#222'
                    }
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
            tooltip: {
                enabled: false
            },
            title: {
                text: null
            },
            plotOptions: {
                column: {
                    pointPadding: 0,
                    groupPadding: 0,
                    borderWidth: 0
                }
            },
            series: [{
                data: Ext.Array.clone(dist),
                color: '#ccc',
                states: {
                    select: {
                        color: '#f09999'
                    }
                }
            }]
        
        });
        slider.chartEl = cmp.el;
        slider.chartEl.down('text').setStyle({visibility:'hidden'});
        
        slider.chart = chart;
    },
    
    changeActiveState: function(btn) {
        if (btn.xtype!='tool') {
            var active = btn;
            btn = Ext.ComponentQuery.query('#advancedfilters tool[type=poweron]')[0];
            if (active) {
                $(btn.el.dom).addClass('tool-active');
            }
            else {
                $(btn.el.dom).removeClass('tool-active');
            }
            this.filterActive = $(btn.el.dom).hasClass('tool-active');
        }
        else {
            $(btn.el.dom).toggleClass('tool-active');
            this.filterActive = $(btn.el.dom).hasClass('tool-active');
            this.applyFilters();
        }
        
    },
            
    reconfigureFiltersCall: function(filters) {
        if (!this.attrs || !this.attrs.length) return;
        var areas = {};
        var placeNode = this.getController('Area').placeNode;
        if (placeNode) {
            placeNode.cascadeBy(function(node) {
                var at = node.get('at');
                var loc = node.get('loc');
                if (!at || !loc || !node.isVisible())
                    return;
                var gid = node.get('gid');
                areas[loc] = areas[loc] || {}
                areas[loc][at] = areas[loc][at] || [];
                areas[loc][at].push(gid);
            })
            
        }
        else {
            areas = this.getController('Area').allMap;
        }
        
        
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var years = [Ext.ComponentQuery.query('#selyear')[0].getValue()[0]];
        var params = {
            dataset: datasetId,
            years: JSON.stringify(years),
            attrs: JSON.stringify(this.attrs),
            areas: JSON.stringify(areas)
        }
    
        if (filters) {
            params['filters'] = JSON.stringify(filters);
        }
        
    
        Ext.Ajax.request({
            url: Config.url + '/api/filter/filter',
            params: params,
            scope: this,
            method: 'GET',
            success: filters ? this.applyFiltersCallback : this.reconfigureFiltersCallback
        })
    },    
        
    reconfigureFiltersCallback: function(response) {
        var attrMap = JSON.parse(response.responseText).data.metaData;
        var selMap = JSON.parse(response.responseText).data.data;
        if (attrMap) {
            this.updateDistributions(attrMap);
            if (this.initialValues) {
                this.changeActiveState(true);
                for (var key in this.initialValues) {
                    var slider = Ext.ComponentQuery.query('multislider[attrname='+key+']')[0];
                    if (!slider) continue;
                    slider.setValue(this.initialValues[key])
                }
                
                this.initialValues = null;
                var filterPanel = Ext.ComponentQuery.query('#advancedfilters')[0];
                filterPanel.doLayout();
                this.afterAccordionLayout();
            }
        }
       
    },
        
    applyFiltersCallback: function(response) {
        var areas = JSON.parse(response.responseText).data;
        
        this.getController('DomManipulation').deactivateLoadingMask();
        this.getController('Select').selectInternal(areas);
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
                this.createChart(slider,attrCfg.dist,true);
            }
            
        }
        filterPanel.doLayout();
        this.afterAccordionLayout();
    },
        
    updateSlider: function(slider,cfg,sliderIsNew) {
        var container = slider.up('container');
        var attrName = cfg.attrObj.attrName + ' ('+cfg.units+')';
        slider.decimalPrecision = Math.max(0,-cfg.decimal);
        slider.increment = Math.pow(10,cfg.decimal);
        var newValue = null;
        if (!sliderIsNew) {
            var val = slider.getValue();
            if (val[0]==slider.minValue && val[1]==slider.maxValue) {
                newValue = [cfg.min,cfg.max];
            }
            else if (val[0]<cfg.min || val[1]>cfg.max) {
                newValue = [cfg.min,cfg.max];
                Puma.util.Msg.msg('Filter '+slider.attrObj.attrName+' was reset','','l');
            }
        }
        
        
        slider.setMinValue(cfg.min);
        slider.setMaxValue(cfg.max);
        
        
        
        container.down('#attrName').setValue(attrName);
        container.down('#minValue').el ? container.down('#minValue').el.setHTML(String(cfg.min)) : container.down('#minValue').cfgVal = String(cfg.min);
        container.down('#maxValue').el ? container.down('#maxValue').el.setHTML(String(cfg.max)) : container.down('#maxValue').cfgVal = String(cfg.max);
        if (newValue) {
            slider.setValue(newValue,false);
            this.afterAccordionLayout(slider);
        }
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



