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
    },
    
    onFilterDragStart: function(slider,value,thumb) {
        var id = slider.thumbs[0]==thumb ? 'thumb1' : 'thumb2';
        var label = slider.up('container').down('#'+id);
        var labelEl = label.el;
        if (!labelEl) return;
        labelEl.addCls('sliding');
    },
    
    onFilterDragEnd: function(slider,value,thumb) {
        var label1 = slider.up('container').down('#thumb1');
        var label1El = label1.el;
        var label2 = slider.up('container').down('#thumb2');
        var label2El = label2.el;
        if (!label1El || !label2El) return;
        label1El.removeCls('sliding');
        label2El.removeCls('sliding');
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
        this.minFl = cfg.constrainFl[0];
        this.maxFl = cfg.constrainFl[1];
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
        
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var dataset = Ext.StoreMgr.lookup('dataset').getById(datasetId);
        
        var themeId = Ext.ComponentQuery.query('#seltheme')[0].getValue();
        var theme = Ext.StoreMgr.lookup('theme').getById(themeId);
        
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
        
        
        var featureLayers = dataset.get('featureLayers');
        var filteredFeatureLayers = [];
        for (var i=this.minFl;i<=this.maxFl;i++) {
            filteredFeatureLayers.push(featureLayers[i]);
        }
        if (!attrs.length) {
            this.applyFilters();
            return;
        }
        Ext.Ajax.request({
            url: Config.url + '/api/filter/getFilterConfig',
            params: {
                attrs: JSON.stringify(attrs),
                dataset: datasetId,
                featureLayers: JSON.stringify(filteredFeatureLayers),
                years: JSON.stringify(theme.get('years'))
            },
            scope: this,
            method: 'GET',
            cfg: cfg,
            attrs: attrs,
            success: this.reconfigureFiltersCallback
        })
        
        
    },
    reconfigureFiltersCallback: function(response) {
        var filterPanel = Ext.ComponentQuery.query('#advancedfilters')[0];
        var attrs = response.request.options.attrs;
        var cfg = response.request.options.cfg;
        var attrMap = JSON.parse(response.responseText).data;
        
        var attrCfgs = [];
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i]
            var idx = Ext.Array.indexOf(cfg.attrs, attr);
            var attrIndex = 'as_'+attr.as+'_attr_'+attr.attr
            if (Ext.Array.contains(attrCfgs,attrIndex)) {
                continue;
            }
            attrCfgs.push(attrIndex);
            var attrCfg = attrMap[attrIndex];
            attrCfg.attrObj = attr;
            var cnt = this.getFilterItems([attrCfg])[0]
            filterPanel.insert(idx, cnt)
        }
        this.applyFilters();
    },
        
    getFilterItems: function(attrCfgs) {
        var items = [];
        
        for (var i = 0; i < attrCfgs.length; i++) {
            var attrCfg = attrCfgs[i];
            attrCfg.multiplier = attrCfg.multiplier || 1;
            var min = attrCfg.value ? attrCfg.value[0] : attrCfg.min;
            var max = attrCfg.value ? attrCfg.value[1] : attrCfg.max;
            var cnt = {
                xtype: 'container',
                margin: 5,
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [{
                        xtype: 'displayfield',
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
                            html: 10
                        },{
                            xtype: 'component',
                            itemId: 'thumb2',
                            cls: 'slider-thumb-label',
                            html: 20
                        }]
                    },
                    {
                        xtype: 'multislider',
                        useTips: false,
                        clickToChange: false,
                        values: [min*attrCfg.multiplier,max*attrCfg.multiplier],
                        multiplier: attrCfg.multiplier,
                        attrObj: attrCfg.attrObj,
                        increment: attrCfg.inc,
                        units: attrCfg.units,
                        minValue: attrCfg.min*attrCfg.multiplier,
                        maxValue: attrCfg.max*attrCfg.multiplier,
                        constrainThumbs: true
                    },{
                        xtype: 'container',
                        layout: {
                            type: 'hbox'
                        },
                        items: [{
                            xtype: 'container',
                            flex: 1,
                            items: [{xtype: 'component',cls: 'slider-constraints slider-constraint-min',html: String(attrCfg.min)}],
                            layout: {
                                type: 'hbox',
                                pack: 'start'
                            }
                        },{
                            xtype: 'container',
                            flex: 1,
                            items: [{xtype: 'component',cls: 'slider-constraints slider-constraint-max',html: String(attrCfg.max)}],
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



