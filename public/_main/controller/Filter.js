Ext.define('PumaMain.controller.Filter', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    '#advancedfilters multislider' : {
                        changecomplete: this.applyFilters
                    }
                })
    },
    
    applyFilters: function(withoutRefresh) {
        var sliders = Ext.ComponentQuery.query('#advancedfilters multislider');
        var areaController = this.getController('Area');
        var filters = [];
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var obj = Ext.clone(slider.attrObj);
            var val = slider.getValue();
            obj.min = val[0];
            obj.max = val[1];
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
            this.getController('LocationTheme').onYearChange({itemId:'filter'});
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
        debugger;
        var filterPanel = Ext.ComponentQuery.query('#advancedfilters')[0];
        var attrs = response.request.options.attrs;
        var cfg = response.request.options.cfg;
        var attrMap = JSON.parse(response.responseText).data;
        
        
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i]
            var idx = Ext.Array.indexOf(cfg.attrs, attr);
            var attrCfg = attrMap['as_'+attr.as+'_attr_'+attr.attr];
            var cnt = {
                xtype: 'container',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [{
                        xtype: 'displayfield',
                        value: attr.attrName
                    }, {
                        xtype: 'multislider',
                        values: [attrCfg.min,attrCfg.max],
                        attrObj: attr,
                        increment: attrCfg.inc,
                        minValue: attrCfg.min,
                        maxValue: attrCfg.max,
                        constrainThumbs: true
                    }]
            }

            filterPanel.insert(idx, cnt)
        }
        this.applyFilters();
    },
        
    getFilterItems: function(filters) {
        var items = [];
        for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            var cnt = {
                xtype: 'container',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [{
                        xtype: 'displayfield',
                        value: filter.attrObj.attrName
                    }, {
                        xtype: 'multislider',
                        values: filter.value,
                        attrObj: filter.attrObj,
                        increment: filter.inc,
                        minValue: filter.min,
                        maxValue: filter.max,
                        constrainThumbs: true
                    }]
            }
            items.push(cnt)
        }
        return items;


    }
    
})



