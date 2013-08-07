Ext.define('PumaMain.controller.Store', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [
        'Puma.model.Location',
        'Puma.model.AttributeSet',
        'Puma.model.Attribute',
        'Puma.model.AreaTemplate',
        'Puma.model.Dataset',
        'Puma.model.Topic',
        //'Puma.model.LayerTemplate',
        //'Puma.model.LayerTemplateExt',
        'Puma.model.Symbology',
        'Puma.model.LayerRef',
        'Puma.model.LayerServer',
        'Puma.model.Theme',
        'Puma.model.Aggregated',
        'Puma.model.Area',
        'Puma.model.Year',
        'Puma.model.Scope',
        'Puma.model.MapLayer',
        'Puma.model.MappedAttribute',
        'Puma.model.Visualization',
        'Puma.model.MappedChartAttribute',
        'Ext.data.Store',
        'Gisatlib.data.SlaveStore',
        'Gisatlib.data.AggregatedStore'
    ],
    init: function() {
        this.initStores();
        this.initSlaveStores();
        this.initLocalStores();
        this.initAggregatedStores();
        this.initEvents();
    },
        
    initAggregatedStores: function() {
        
    
    },
    initStores: function() {
        
        Ext.create('Ext.data.Store',{
            storeId: 'location',
            autoLoad: true,
            model: 'Puma.model.Location'
        })
        Ext.create('Ext.data.Store',{
            storeId: 'theme',
            autoLoad: true,
            model: 'Puma.model.Theme'
        })
        
    
        Ext.create('Ext.data.Store',{
            storeId: 'attributeset',
            autoLoad: true,
            model: 'Puma.model.AttributeSet'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'attribute',
            autoLoad: true,
            model: 'Puma.model.Attribute'
        })
        
        Ext.create('Ext.data.Store',{
            storeId: 'visualization',
            autoLoad: true,
            model: 'Puma.model.Visualization'
        })
        
    
        Ext.create('Ext.data.Store',{
            storeId: 'year',
            autoLoad: true,
            model: 'Puma.model.Year'
        })
        
      
    
        Ext.create('Ext.data.Store',{
            storeId: 'scope',
            autoLoad: true,
            model: 'Puma.model.Scope'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'areatemplate',
            autoLoad: true,
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'symbology',
            autoLoad: true,
            model: 'Puma.model.Symbology'
        })
        Ext.create('Ext.data.TreeStore', {
            model: 'Puma.model.Area',
            root: {
                expanded: false,
                children: [{text: "Child 1", leaf: true}]
            },
            sorters: [{
                property: 'name',
                direction: 'ASC'
            }],
            storeId: 'area'
        })
        Ext.create('Ext.data.Store',{
            storeId: 'dataset',
            autoLoad: true,
            model: 'Puma.model.Dataset'
        })
        Ext.create('Ext.data.Store',{
            storeId: 'topic',
            autoLoad: true,
            model: 'Puma.model.Topic'
        })
    },
        
    initEvents: function() {
        var me = this;
        var areaStore = Ext.StoreMgr.lookup('area');
        areaStore.on('beforeload',function(store,options) {
            me.getController('Area').onBeforeLoad(store,options);
        },this);
        areaStore.on('load',function(store,node,records) {
            me.getController('Area').onLoad(store,node,records);
        },this);
        Ext.StoreMgr.lookup('activedataset').on('load',function(store) {
            me.getController('Settings').onDatasetLoad();
        })
        Ext.StoreMgr.lookup('selectedlayers').on('datachanged',function(store) {
            me.getController('Layers').onLayerDrop();
        })
    },
        
    initSlaveStores: function() {
       
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'visualization4window',
            model: 'Puma.model.Visualization'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'activescope',
            filters: [function(rec) {
                    return rec.get('active');
            }],
            model: 'Puma.model.Scope'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'activedataset',
            filters: [function(rec) {
                    return rec.get('active');
            }],
            model: 'Puma.model.Dataset'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'activelocation',
            filters: [function(rec) {
                    return rec.get('active');
            }],
            model: 'Puma.model.Location'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'activeattributeset',
            filters: [function(rec) {
                    return rec.get('active');
            }],
            model: 'Puma.model.AttributeSet'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attributeset4chart',
            model: 'Puma.model.AttributeSet'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'featurelayertemplate',
            filters: [function(rec) {
                return !rec.get('justVisualization') && rec.get('active');
            }],
            model: 'Puma.model.AreaTemplate'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'layertemplate',
            filters: [function(rec) {
                return rec.get('justVisualization') && rec.get('active');
            }],
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attribute4chart',
            sorters: [{
                property: 'code',
                direction: 'ASC'
            }],
            filters: [function(rec) {
                    return false;
            }],
            model: 'Puma.model.Attribute'
        })
         Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'normattribute4chart',
            sorters: [{
                property: 'code',
                direction: 'ASC'
            }],
            filters: [function(rec) {
                    return false;
            }],
            model: 'Puma.model.Attribute'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attribute4chart4norm',
            filters: [function(rec) {
                    return false;
            }],
            model: 'Puma.model.Attribute'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'year4chart',
            model: 'Puma.model.Year'
        })
    },
        
    initLocalStores: function() {
     
     
     
        
        
        
        Ext.create('Ext.data.TreeStore', {
            fields: ['text'],
            model: 'Puma.model.MapLayer',
            storeId: 'layers',
            root: {
                expanded: true,
                children: [{
                    name: 'System',
                    type: 'systemgroup',
                    checked: null
                },{
                    name: 'Base',
                    type: 'basegroup',
                    checked: null
                }]
            }
        })
    
        Ext.create('Ext.data.Store', {
            fields: ['text'],
            model: 'Puma.model.MapLayer',
            filters: [function(rec) {
                return rec.get('checked');
            }],
            storeId: 'selectedlayers'
        })
        
        
        
        Ext.create('Ext.data.Store', {
            fields: ['name','type'],
            storeId: 'classificationtype',
            data: [{
                name: 'Continuous',
                type: 'continuous'
            },{
                name: 'Equal',
                type: 'equal'
            },{
                name: 'Quantiles',
                type: 'quantiles'
            },{
                name: 'Range',
                type: 'range'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'charttype4chart',
            fields: ['name','type'],
            data: [{
                name: 'Grid',
                type: 'grid'
            },{
                name: 'Column',
                type: 'columnchart'
            },{
                name: 'Scatter',
                type: 'scatterchart'
            },{
                name: 'Pie',
                type: 'piechart'
            }
//            ,
//            {
//                name: 'Feature count',
//                type: 'featurecount'
//            }
            ,{
                name: 'Extent outline',
                type: 'extentoutline'
            },{
                name: 'Just map',
                type: 'justmap'
            },{
                name: 'Filter',
                type: 'filter'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'stacking4chart',
            fields: ['name','type'],
            data: [{
                name: 'None',
                type: 'none'
            },{
                name: 'Percent',
                type: 'percent'
            },{
                name: 'Normal',
                type: 'normal'
            },{
                name: 'Double',
                type: 'double'
            }]
        })
        Ext.create('Ext.data.Store',{
            storeId: 'aggregate4chart',
            fields: ['name','type'],
            data: [{
                name: 'None',
                type: 'none'
            },
//            {
//                name: 'Min',
//                type: 'min'
//            },{
//                name: 'Max',
//                type: 'max'
//            },
            {
                name: 'Average',
                type: 'avg'
            },{
                name: 'Tree top',
                type: 'toptree'
            },{
                name: 'All',
                type: 'topall'
            },{
                name: 'Select',
                type: 'select'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'areas4chart',
            fields: ['name','type'],
            data: [{
                name: 'Just Select',
                type: 'select'
            },{
                name: 'Tree all',
                type: 'treeall'
            },{
                name: 'Tree lowest level',
                type: 'treelowest'
            }
//            ,{
//                name: 'Tree highest level',
//                type: 'treehighest'
//            }
        ]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'normalization4chart',
            fields: ['name','type'],
            data: [{
                name: 'None',
                type: 'none'
            },{
                name: 'Area',
                type: 'area'
            },{
                name: 'Attribute',
                type: 'attribute'
            },{
                name: 'Attribute set',
                type: 'attributeset'
            },{
                name: 'Tree',
                type: 'toptree'
            },{
                name: 'All',
                type: 'topall'
            },{
                name: 'Select',
                type: 'select'
            },
            {
                name: 'Year',
                type: 'year'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'mappedattribute4chart',
            model: 'Puma.model.MappedChartAttribute',
            data: []
        })
    }
    
});


