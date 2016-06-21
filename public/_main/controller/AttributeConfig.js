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
                'addattributetree #add' : {
                    click: this.onAttributeAdded
                },
                'addattributetree #back' : {
                    click: this.backToInitial
                },
				'addattributetree': {
					checkchange: this.onAddAttrCheck,
					itemclick: this.onAddAttrItemClick
				},
				//'chartConfigurationWindow': {
				//	close: this.onChartConfWindowClose
				//},
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
        var attrStore = btn.up('[itemId=attributecontainer]').down('attributegrid').store
        var recs = this.getChecked(attrStore);
        if (recs.length<1) {
            return;
        }
        
        this.setActiveCard(btn,4);
        
        var form = btn.up('[itemId=attributecontainer]').down('choroplethform')
        if (recs.length==1) {
            form.down('#classType').setValue(recs[0].get('classType'));
            form.down('#numCategories').setValue(recs[0].get('numCategories'));
        }
        else {
            form.getForm().reset();
        }
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
            rec.set('zeroesAsNull',true);
            rec.commit();
        }
        
        this.setActiveCard(btn,0);
    },
    
    
    
    onConfigureFinish: function(cmp) {
        var form = cmp.up('configform');
        var values = form.getForm().getValues();
        var attrs = values.attrs;
        var attrMap = {};
        var isSelect = null
        for (var i=0;i<attrs.length;i++) {
            var attr = attrs[i];
            var attrName = 'as_'+attr.as+'_attr_'+attr.attr;
            if (attrMap[attrName]) {
                Puma.util.Msg.msg('Duplicate attributes not allowed','','l');
                return;
            }
            
            attrMap[attrName] = true;
            var type = attr.normType;
            if (isSelect === true && type!='select') {
                Puma.util.Msg.msg('All attributes have to be normalized to "First selected"','','l');
                return;
            }
            if (isSelect === false && type=='select') {
                Puma.util.Msg.msg('All attributes have to be normalized to "First selected"','','l');
                return;
            }
            isSelect = type == 'select';
        }
        
        
        
        delete values['normType'];
        delete values['normYear'];
        delete values['normAttribute'];
        delete values['normAttributeSet'];
        if (form.chart) {
            form.chart.cfg = values;
            this.getController('Chart').reconfigureChart(form.chart,false,false,true)
        }
        else if (form.formType=='chart') {
            this.getController('Chart').addChart(values);
        }
        else if (form.formType=='layers') {
            this.getController('Layers').reconfigureChoropleths(values);
        }
        else if (form.formType=='filters') {
            this.filterConfig = values.attrs;
            this.getController('Filter').reconfigureFilters(values);
        }
        form.up('window').close();
    },
        
    onConfigureClick: function(cmp) {
        var formType = 'chart';
        var cfg = {attrs:[]};
        var chart = null;
        if (cmp.itemId == 'configurelayers') {
            formType = 'layers'
            cfg = {attrs:this.layerConfig || []} ;
        }
        else if (cmp.itemId == 'configurefilters') {
            formType = 'filters';
            cfg = {attrs:this.filterConfig || []} ;
        }
        else if (cmp.xtype == 'tool') {
            chart = cmp.up('chartpanel').chart
            cfg = chart.cfg;
        }
        var datasetId = Ext.ComponentQuery.query('#seldataset')[0].getValue();
        var dataset = Ext.StoreMgr.lookup('dataset').getById(datasetId);
        var levels = dataset.get('featureLayers');
        var fls = Ext.StoreMgr.lookup('layertemplate').queryBy(function(rec) {
            return Ext.Array.contains(levels,rec.get('_id'));
        }).getRange();
        var title = 'Chart configuration';
        switch (cmp.xtype=='tool' ? 'tool' : cmp.itemId) {
            case 'configurelayers':
                title = 'Thematic maps configuration'; break;
            case 'configurefilters':
                title = 'Filters configuration'; break;
            case 'tool':
                title += ' - '+cfg.title
            
        }
        var window = Ext.widget('window',{
			//itemId: 'chartConfigurationWindow',
			//id: 'chartConfigurationWindow',
            layout: 'fit',
            width: 710,
            height: 724,
            
            title: title,
            items: [{
                xtype: 'configform',
                featureLayers: fls,
                padding: 5,
                cls: 'configform',
                chart: chart,
                formType: formType
            }],
			listeners: {
				// JJJ jak se to dela, aby se listenery prirazovaly v this.control?
				close: this.onChartConfWindowClose
			}
        })
        window.show();
        window.down('configform').getForm().setValues(cfg);
        return false;
    },
	
	onChartConfWindowClose: function(){
		Ext.StoreMgr.lookup('attributes2choose').getRootNode().cascadeBy(function(node){
			if(node.get('checked')) node.set('checked', false);
		});
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
    
	// triggered when AddAttributeTree opened
    onAddAttribute: function(btn) {
        this.setActiveCard(btn,1);
    },
    onNormalizeAttribute: function(btn) {
        
        var attrStore = btn.up('[itemId=attributecontainer]').down('attributegrid').store
        var recs = this.getChecked(attrStore);
        if (recs.length<1) {
            return;
        }
        
        this.setActiveCard(btn,2);
        
        var form = btn.up('[itemId=attributecontainer]').down('normalizeform')
        if (recs.length==1) {
            form.down('#normType').setValue(recs[0].get('normType'));
            form.down('#normAttributeSet').setValue(recs[0].get('normAs'));
            form.down('#normAttribute').setValue(recs[0].get('normAttr'));
        }
        else {
            form.getForm().reset();
        }
    },
    onRemoveAttribute: function(btn) {
        var store = btn.up('grid').store;
        var recs = this.getChecked(store);
        store.remove(recs);
    },
	
	// triggered on change of any checkbox in AddAttributeTree
	onAddAttrCheck: function(checkNode, checked){
		if(checkNode.get('attr')){
			var parentChecked = true;
			Ext.Array.each(checkNode.parentNode.childNodes, function(node){
				if( !node.get('checked') ) return parentChecked = false;
			});
			checkNode.parentNode.set('checked', parentChecked);
			
		}else if(checkNode.get('as')){
			// check/uncheck all attributes of this attribute set
			Ext.Array.each(checkNode.childNodes, function(node){
				node.set('checked', checked);
			});
			if( checked ) checkNode.expand();
		}
		
	},
	
	onAddAttrItemClick: function(view, node, item, index, e){
		if(node.get('attr') && e.target.className != 'x-tree-checkbox'){
			node.set('checked', !node.get('checked'));
			this.onAddAttrCheck(node);
		}
	},
	
	// triggered when attribute addition is confirmed in AddAttributeTree
    onAttributeAdded: function(btn) {
        var store = btn.up('addattributetree').store;
        var recs = this.getChecked(store);
        var newRecs = [];
        for (var i=0;i<recs.length;i++) {
            var rec = recs[i];
			if(!rec.get('attr')) continue;
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
		
		// unselect all
		store.getRootNode().cascadeBy(function(node){
			if(node.get('checked')) node.set('checked', false);
		});

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
        //var normYear = normalize ? form.getComponent('normYear').getValue() : null;
        for (var i=0;i<recs.length;i++) {
            var rec = recs[i];
            rec.set('normType',normType);
            rec.set('normAttr',normAttr);
            rec.set('normAs',normAs);
            //rec.set('normYear',normYear);
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
        var configForm = combo.up('configform');
        var advanced = Ext.ComponentQuery.query('#advancedfieldset',configForm)[0];
        var cardContainer = Ext.ComponentQuery.query('#attributecontainer',configForm)[0];
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
		if(!store.tree){
	        return store.query('checked',true).getRange();
		}else{
			var checkedNodes = [];
			store.getRootNode().cascadeBy(function(node){
				if(node.get('checked')) checkedNodes.push(node);
			});
			return checkedNodes;
		}
    }
});


