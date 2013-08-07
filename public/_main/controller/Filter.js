Ext.define('PumaMain.controller.Filter', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    "chartbar #applyfilterbtn": {
                        click: this.onApplyFilter
                    },
                    "chartbar #clearfilterbtn": {
                        click: this.onClearFilter
                    }
                })
    },
    onApplyFilter: function(btn) {
        var areaTemplates = btn.up('panel').chart.cfg.areaTemplates
        var sliders = Ext.ComponentQuery.query('multislider',btn.up('panel'));
        var filter = {
            areaTemplates: {},
        };
        for (var i=0;i<areaTemplates.length;i++) {
            filter.areaTemplates[areaTemplates[i]] = true;
        }
        var filters = [];
        for (var i=0;i<sliders.length;i++) {
            var slider = sliders[i];
            var value = slider.getValue();
            var attr = Ext.clone(slider.attr);
            attr.min = value[0];
            attr.max = value[1];
            filters.push(attr);
        }
        filter.filters = filters;
        var yearBtn = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0];
        this.getController('Area').areaFilter = filter;
        this.getController('LocationTheme').requestNewLayers(yearBtn);
    },
        
    onClearFilter: function(btn) {
        var yearBtn = Ext.ComponentQuery.query('initialbar #yearcontainer button[pressed=true]')[0];
        this.getController('Area').areaFilter = null;
        this.getController('LocationTheme').requestNewLayers(yearBtn);
    }
})
    


