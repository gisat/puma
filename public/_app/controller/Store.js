Ext.define('PumaMng.controller.Store',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: [
        'Puma.model.Location',
        'Puma.model.AttributeSet',
        'Puma.model.AreaTemplate',
        'Puma.model.Year',
        'Puma.model.Attribute',
        
        'Puma.model.SymbologyLayer',
        'Puma.model.Analysis',
        'Puma.model.PerformedAnalysis',
        'Puma.model.AttributeLocal',
        'Puma.model.Tree',
        'Puma.model.Symbology',
        'Puma.model.LayerRef',
        'Puma.model.LayerMap',
        'Puma.model.LayerServer',
        'Puma.model.Theme',
        'Puma.model.Visualization',
        'Puma.model.Aggregated',
        'Puma.model.Scope',
        'Puma.model.Column',
        'Puma.model.ColumnMap',
        'Puma.model.SymbologyTemplate',
        'Puma.model.MappedAttribute',
        'Ext.data.Store',
        'Gisatlib.data.SlaveStore',
        'Gisatlib.data.AggregatedStore'
    ],
    
  
    init: function() {
        
        this.initSlaveStores();
        this.initMasterStores();
        this.initAggregatedStores();
        this.initUserDependentStores();
        this.initLocalStores();
        
        var stores = Ext.StoreMgr.getRange();
        for (var i=0;i<stores.length;i++) {
            var store = stores[i];
            if (store.slave) continue;
            store.on('update',this.onStoreUpdate)
        }
        var me = this;
        this.application.on('login',function(loggedIn) {
            if (!loggedIn) return;
            me.loadUserDependentStores();
        })
//        setInterval(function() {
//            Ext.StoreMgr.lookup('performedanalysis').load();
//        },5000)
       
    },
        
    initAggregatedStores: function() {
    
        
    
        Ext.create('Gisatlib.data.AggregatedStore',{
            stores: [Ext.StoreMgr.lookup('tree'),Ext.StoreMgr.lookup('featurelayertemplatemng')],
            autoLoad: true,
            storeId: 'tree4theme',
            model: 'Puma.model.Aggregated'
        })
    },
        
    initLocalStores: function() {
        Ext.create('Ext.data.Store',{
            storeId: 'comparisontype',
            fields: ['name','type'],
            data: [{
                name: '>=',
                type: '>='
            },{
                name: '<',
                type: '<'
            }]
        })
    
        Ext.create('Ext.data.Store', {
            model: 'Puma.model.Column',
            storeId: 'columnnumber',
            data: []
        })
    
        Ext.create('Ext.data.Store', {
            model: 'Puma.model.LayerMap',
            storeId: 'layers4theme',
            data: []
        })
    
        Ext.create('Ext.data.Store', {
            model: 'Puma.model.Column',
            storeId: 'columnstring',
            data: []
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'blank',
            fields: ['name'],
            data: []
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'analysistype',
            fields: ['name','type'],
            idProperty: 'type',
            data: [{
                name: 'Spatial',
                type: 'spatialagg'
            },{
                name: 'FID',
                type: 'fidagg'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'objecttype',
            fields: ['name','type'],
            data: [{
                name: 'Location',
                type: 'location'
            },{
                name: 'Scope',
                type: 'scope'
            },{
                name: 'Year',
                type: 'year'
            },{
                name: 'Layer template',
                type: 'layertemplatejustviz'
            },{
                name: 'Feature layer template',
                type: 'featurelayertemplate'
            },{
                name: 'Tree',
                type: 'tree'
            },{
                name: 'Attribute',
                type: 'attribute'
            },{
                name: 'Attribute set',
                type: 'attributeset'
            },{
                name: 'Symbology layer',
                type: 'symbologylayer'
            }
            ,
            {
                name: 'Theme',
                type: 'theme'
            },
            {
                name: 'Symbology',
                type: 'symbology'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'attributetype',
            fields: ['name','type'],
            data: [{
                name: 'Numeric',
                type: 'numeric'
            },{
                name: 'Text',
                type: 'text'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'attributetype',
            fields: ['name','type'],
            data: [{
                name: 'Numeric',
                type: 'numeric'
            },{
                name: 'Text',
                type: 'text'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'spatialaggtype',
            
            idProperty: 'type',
            fields: ['name','type'],
            data: [{
                name: 'Count',
                type: 'count'
            },{
                name: 'Avg area/length',
                type: 'avgarea'
            },{
                name: 'Sum area/length',
                type: 'sumarea'
            },{
                name: 'Sum attribute',
                type: 'sumattr'
            },{
                name: 'Avg attribute (weight area/length)',
                type: 'avgattrarea'
            },{
                name: 'Avg attribute (weight attribute)',
                type: 'avgattrattr'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'fidaggtype',
            
            idProperty: 'type',
            fields: ['name','type'],
            data: [{
                name: 'Sum area/length',
                type: 'sum'
            },{
                name: 'Avg (weight area/length)',
                type: 'avgarea'
            },{
                name: 'Avg (weight attribute)',
                type: 'avgattr'
            }]
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'layertype4theme',
            fields: ['name','type'],
            data: [{
                name: 'Polygon',
                type: 'polygon'
            },{
                name: 'Line',
                type: 'line'
            },{
                name: 'Point',
                type: 'point'
            }]
        })
    
        
    
        Ext.create('Ext.data.Store',{
            storeId: 'mappedattribute4symbologytemplate',
            model: 'Puma.model.MappedAttribute',
            data: []
        })
    
        
    
        Ext.create('Ext.data.Store',{
            storeId: 'selectedattribute4attributeset',
            model: 'Puma.model.AttributeLocal',
            data: []
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'mappedattribute4symbology',
            model: 'Puma.model.MappedAttribute',
            data: []
        })
    
        
        
        
    },
        
    initMasterStores: function() {
        Ext.create('Ext.data.Store',{
            storeId: 'location',
            autoLoad: true,
            model: 'Puma.model.Location'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'symbologylayer',
            autoLoad: true,
            model: 'Puma.model.SymbologyLayer'
        })
        Ext.create('Ext.data.Store',{
            storeId: 'theme',
            autoLoad: true,
            model: 'Puma.model.Theme'
        })
        Ext.create('Ext.data.Store',{
            storeId: 'visualization',
            autoLoad: true,
            model: 'Puma.model.Visualization'
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
            storeId: 'areatemplate',
            autoLoad: true,
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'year',
            autoLoad: true,
            model: 'Puma.model.Year'
        })
        
    
        Ext.create('Ext.data.Store',{
            storeId: 'tree',
            autoLoad: true,
            model: 'Puma.model.Tree'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'symbology',
            autoLoad: true,
            model: 'Puma.model.Symbology'
        })
    
    
        Ext.create('Ext.data.Store',{
            storeId: 'layerref',
            autoLoad: true,
            model: 'Puma.model.LayerRef'
        })
        
        Ext.create('Ext.data.Store',{
            storeId: 'scope',
            autoLoad: true,
            model: 'Puma.model.Scope'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'analysis',
            autoLoad: true,
            model: 'Puma.model.Analysis'
        })
    
        Ext.create('Ext.data.Store',{
            storeId: 'performedanalysis',
            autoLoad: true,
            model: 'Puma.model.PerformedAnalysis'
        })
        
    
    },
        
    initUserDependentStores: function() {
        Ext.create('Ext.data.Store',{
            storeId: 'layerserver',
            model: 'Puma.model.LayerServer'
        })
    },
        
    loadUserDependentStores: function() {
        Ext.StoreMgr.lookup('layerserver').load();
    },
        
    initSlaveStores: function() {
        
        // for management
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'locationmng',
            model: 'Puma.model.Location'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'scopemng',
            model: 'Puma.model.Scope'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'yearmng',
            model: 'Puma.model.Year'
        })
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'symbologylayermng',
            model: 'Puma.model.SymbologyLayer'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'featurelayertemplatemng',
            filters: [function(rec) {
                return !rec.get('justVisualization');
            }],
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'layertemplatejustvizmng',
            filters: [function(rec) {
                return rec.get('justVisualization');
            }],
            model: 'Puma.model.AreaTemplate'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'treemng',
            model: 'Puma.model.Tree'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attributemng',
            model: 'Puma.model.Attribute'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attributesetmng',
            model: 'Puma.model.AttributeSet'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'symbologymng',
            model: 'Puma.model.Symbology'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'symbologymng',
            model: 'Puma.model.Symbology'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'thememng',
            model: 'Puma.model.Theme'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'analysismng',
            filters: [function() {
                    return false
        
                }
            ],
            model: 'Puma.model.Analysis'
        })
        
        // forms internal
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attribute4attributeset',
            sorters: [{
                property: 'code',
                direction: 'ASC'
            }],
            model: 'Puma.model.Attribute'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'featurelayertemplate4tree',
            filters: [function(rec) {
                return !rec.get('justVisualization');
            }],
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'areatemplate4spatialagg',
            filters: [function(rec) {
                return !rec.get('justVisualization');
            }],
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attribute4spatialagg',
            filters: [function(rec) {
                return false
            }],
            model: 'Puma.model.Attribute'
        })
        
        
        /////
        
         Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'year4layerref',
            filters: [function(rec) {
                return rec.get('active')!==false;
            }],
            model: 'Puma.model.Year'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attributeset4layerref',
            filters: [function(rec) {
                return rec.get('active')!==false;
            }],
            model: 'Puma.model.AttributeSet'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'location4layerref',
            filters: [function(rec) {
                return rec.get('active')!==false;
            }],
            model: 'Puma.model.Location'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'areatemplate4layerref',
            filters: [function(rec) {
                return rec.get('active')!==false && rec.get('justVisualization');
            }],
            model: 'Puma.model.AreaTemplate'
        })
        
        //
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'layerref4layerref',
            filters: [function() {
                return false;
            }],
            model: 'Puma.model.LayerRef'
        })
    
        
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'areatemplate4themelayer',
            model: 'Puma.model.AreaTemplate'
        })
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'areatemplate4themelayer2',
            model: 'Puma.model.AreaTemplate'
        })
    

    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'symbology4theme',
            filters: [function() {return false;}],
            model: 'Puma.model.Symbology'
        })
    
    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'defsymbology4theme',
            filters: [function() {return false;}],
            model: 'Puma.model.Symbology'
        })
    
        
    
    
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'attribute4set',
            sorters: [{
                property: 'code',
                direction: 'ASC'
            }],
            filters: [function() {return false;}],
            model: 'Puma.model.Attribute'
        })
        
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            sorters: [{
                property: 'code',
                direction: 'ASC'
            }],
            storeId: 'attribute4layertemplate',
            filters: [function() {return false;}],
            model: 'Puma.model.Attribute'
        })
    

    
        Ext.create('Gisatlib.data.SlaveStore',{
            slave: true,
            storeId: 'areatemplate4tree',
            filters: [],
            model: 'Puma.model.AreaTemplate'
        })
 
    },

    onStoreUpdate: function() {
        var stores = Ext.StoreMgr.getRange();
        for (var i=0;i<stores.length;i++) {
            if (stores[i].slave) {
                
                stores[i].filter();
            }
        }
    }
})

