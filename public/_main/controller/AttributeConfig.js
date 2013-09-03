Ext.define('PumaMain.controller.AttributeConfig', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMain.view.ConfigForm'],
    init: function() {
        this.control(
                {
                '#testConf': {
                    click: this.onTestConf
                },
                
                'attributegrid #add' : {
                    click: this.onAddAttribute
                },
                'attributegrid #remove' : {
                    click: this.onRemoveAttribute
                },
                'attributegrid #normalize' : {
                    click: this.onNormalizeAttribute
                },
                'attributegrid #choroplethparams' : {
                    click: this.onConfigureChoropleth
                },
                'addattributegrid #add' : {
                    click: this.onAttributeAdded
                },
                'addattributegrid #back' : {
                    click: this.backToInitial
                },
                'normalizeform #normalize' : {
                    click: this.onAttributeNormalized
                },
                'normalizeform #dontnormalize' : {
                    click: this.onAttributeNormalized
                },
                'normalizeform #back' : {
                    click: this.backToInitial
                },
                'normalizeform #normAttributeSet': {
                    change: this.onNormAttrSetChange
                },
                'normalizeform #normType': {
                    change: this.onNormTypeChange
                },
            
                'choroplethform #apply' : {
                    click: this.onChoroplethParamsApplied
                },
                'choroplethform #classType' : {
                    change: this.onClassTypeChanged
                },
                'choroplethform #back' : {
                    click: this.backToInitial
                },
                
                'configform #type': {
                    change: this.onChartTypeChange
                },
                
                'chartbar panel[cfgType=add]': {
                    beforeexpand: this.onConfigureClick
                },
                
                'chartpanel tool[type=gear]': {
                    click: this.onConfigureClick
                },
                '#configurelayers' : {
                    click: this.onConfigureClick
                },
                '#configurefilters': {
                    click: this.onConfigureClick
                },
                'configform #configurefinish' : {
                    click: this.onConfigureFinish
                }
            
                })
    },
    
            
    onConfigureChoropleth: function(btn) {
        this.setActiveCard(btn,4);
    },
    onClassTypeChanged: function(combo,val) {
        var categories = combo.up('panel').down('#numCategories');
        if (val=='continuous') {
            categories.setValue(5);
        }
        categories.setVisible(val!='continuous');
    },        
        
    onChoroplethParamsApplied: function(btn) {
        
        var form = btn.up('panel');
        var attrStore = form.up('[itemId=attributecontainer]').down('attributegrid').store
        var recs = this.getChecked(attrStore);
        for (var i=0;i<recs.length;i++) {
            var rec = recs[i];
            rec.set('numCategories',form.getComponent('numCategories').getValue());
            rec.set('classType',form.getComponent('classType').getValue());
            rec.set('zeroesAsNull',form.getComponent('zeroesAsNull').getValue());
            rec.commit();
        }
        
        this.setActiveCard(btn,0);
    },
    
    onConfigureFinish: function(cmp) {
        var form = cmp.up('configform');
        var values = form.getForm().getValues();
        delete values['normType'];
        delete values['normYear'];
        delete values['normAttribute'];
        delete values['normAttributeSet'];
        if (form.chart) {
            form.chart.cfg = values;
            this.getController('Chart').reconfigureChart(form.chart)
        }
        else if (form.formType=='chart') {
            this.getController('Chart').addChart(values);
        }
        else if (form.formType=='layers') {
            this.layerConfig = values.attrs;
            this.getController('Layers').reconfigureChoropleths(values);
        }
        else if (form.formType=='filters') {
            this.filterConfig = values.attrs;
            
            this.getController('Filter').reconfigureFilters(values);
        }
    },
        
    onConfigureClick: function(cmp) {
        var formType = 'chart';
        var cfg = {attrs:[]};
        var chart = null;
        if (cmp.itemId == 'configurelayers') {
            formType = 'layers'
            cfg = {attrs:this.layerConfig || []} ;
        }
        if (cmp.itemId == 'configurefilters') {
            formType = 'filters';
            cfg = {attrs:this.filterConfig || []} ;
        }
        if (cmp.xtype == 'tool') {
            chart = cmp.up('chartpanel').chart
            cfg = chart.cfg;
        }
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var dataset = Ext.StoreMgr.lookup('dataset').getById(datasetId);
        var levelCount = dataset.get('featureLayers').length;
        var window = Ext.widget('window',{
            layout: 'fit',
            width: 450,
            items: [{
                xtype: 'configform',
                levelCount: levelCount,
                chart: chart,
                formType: formType
            }]
        })
        window.show();
        window.down('configform').getForm().setValues(cfg);
        return false;
    },
    
    onChartBtnClick: function(parent) {
//        var type = parent.ownerCt.itemId == 'layerpanel' ? 'choroplethpanel' : 'chartconfigpanel';
//        var window = Ext.WindowManager.get('new' + type);
//        
//        //var cfg = this.getChartWindowConfig(null, false, type)
//        window = window || Ext.widget('window', cfg)
//        window.show();
//        return false;
    },
        
    onReconfigureClick: function(btn) {
//        var chart = btn.up('panel').chart;
//        var cfg = this.getChartWindowConfig(chart, true, 'chartconfigpanel');
//        var window = Ext.widget('window', cfg);
//        window.down('chartconfigpanel').getForm().setValues(chart.cfg);
//        window.show();
    },
    
    onAddAttribute: function(btn) {
        this.setActiveCard(btn,1);
    },
    onNormalizeAttribute: function(btn) {
        this.setActiveCard(btn,2);
    },
    onRemoveAttribute: function(btn) {
        var store = btn.up('grid').store;
        var recs = this.getChecked(store);
        store.remove(recs);
    },
  
    onAttributeAdded: function(btn) {
        var store = btn.up('grid').store;
        var recs = this.getChecked(store);
        var newRecs = [];
        for (var i=0;i<recs.length;i++) {
            var rec = recs[i];
            var newRec = Ext.create('Puma.model.MappedChartAttribute',{
                as: rec.get('as'),
                attr: rec.get('attr'),
                normType: 'area',
                checked: true
                
            })
            newRecs.push(newRec)
        }
        var mainStore = btn.up('configform').down('attributegrid').store;
        mainStore.add(newRecs);
        this.setActiveCard(btn,0);
    },
    onAttributeNormalized: function(btn) {
        var normalize = btn.itemId == 'normalize';
        var form = btn.up('panel');
        
        var attrStore = form.up('[itemId=attributecontainer]').down('attributegrid').store
        var recs = this.getChecked(attrStore);
        var normType = normalize ? form.getComponent('normType').getValue() : null;
        var normAttr = normalize ? form.getComponent('normAttribute').getValue() : null;
        var normAs = normalize ? form.getComponent('normAttributeSet').getValue() : null;
        var normYear = normalize ? form.getComponent('normYear').getValue() : null;
        for (var i=0;i<recs.length;i++) {
            var rec = recs[i];
            rec.set('normType',normType);
            rec.set('normAttr',normAttr);
            rec.set('normAs',normAs);
            rec.set('normYear',normYear);
            rec.commit();
        }
        
        this.setActiveCard(btn,0);
    },
        
    onNormAttrSetChange: function(combo,val) {
        var attrSet = val ? Ext.StoreMgr.lookup('attributeset').getById(val) : null;
        var attributes = attrSet ? attrSet.get('attributes') : [];
        var store = combo.up('panel').down('#normAttribute').store;
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(attributes,rec.get('_id'))
        }])
    },
    onNormTypeChange: function(combo,val) {
        var attrCombo = combo.up('panel').down('#normAttribute');
        var attrSetCombo = combo.up('panel').down('#normAttributeSet');
        if (val=='attributeset') {
            attrSetCombo.show();
            attrCombo.hide();
        }
        else if (val=='attribute') {
            attrSetCombo.show();
            attrCombo.show();
        }
        else {
            attrSetCombo.hide();
            attrCombo.hide();
        }
    },
    onChartTypeChange: function(combo,val) {
        var advanced = Ext.ComponentQuery.query('configform #advancedfieldset')[0];
        var cardContainer = Ext.ComponentQuery.query('configform #attributecontainer')[0];
        cardContainer.show();
        if (val!='extentoutline') {
            cardContainer.getLayout().setActiveItem(0);
        }
        else {
            cardContainer.getLayout().setActiveItem(3);
        }
        if (val=='columnchart') {
            advanced.show();
        }
        else {
            advanced.hide();
        }
    },    
    
    backToInitial: function(btn) {
        this.setActiveCard(btn,0);
    },
    setActiveCard: function(cmp,idx) {
        cmp.up('[itemId=attributecontainer]').getLayout().setActiveItem(idx);
    },
    
    getChecked: function(store) {
        return store.query('checked',true).getRange();
    }
});


