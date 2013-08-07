Ext.define('PumaMng.controller.Analysis',{
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['PumaMng.view.analysis.SpatialAggregation','PumaMng.view.analysis.FidAggregation','PumaMng.view.analysis.Math'],
  
    init: function() {
        this.control({
            'analysistab #analysistypegrid': {
                selectionchange: this.onAnalysisTypeSelected
            },
            'performedanalysistab #reloadgridbtn': {
                click: this.onPerformedAnalysisReload
            },
            'performedanalysisform #dataset': {
                change: this.onPerformedDatasetChanged
            },
            'spatialaggform #topics': {
                change: this.onSpatialTopicsChanged
            },
            'spatialaggform #attributeSet': {
                change: this.onAttrSetChanged
            },
            'spatialaggform #areaTemplate': {
                change: this.onAreaTemplateChanged
            },
            'spatialaggform #groupAttributeSet': {
                change: this.onGroupAttrSetChanged
            },
            'fidaggform #topics': {
                change: this.onFidTopicsChanged
            }, 
            'mathform #topics': {
                change: this.onFidTopicsChanged
            }, 
            'fidaggform #attributeSets': {
                change: this.onAttrSetsChanged
            }, 
            'fidaggform #fillbtn': {
                click: this.onFill
            } 
        })
    },
        
    onPerformedDatasetChanged: function(combo,val) {
        if (!val) return;
        var locationStore = Ext.StoreMgr.lookup('location4performedanalysis');
        var flStore = Ext.StoreMgr.lookup('featurelayer4performedanalysis');
        locationStore.clearFilter(true);
        flStore.clearFilter(true);
        var dataset = Ext.StoreMgr.lookup('dataset').getById(val);
        locationStore.filter([function(rec) {
            return rec.get('dataset')==val;
        }])
        var featureLayers = dataset.get('featureLayers')
        flStore.filter([function(rec) {
            return Ext.Array.contains(featureLayers,rec.get('_id'));
        }])
        flStore.sort({
                sorterFn: function(rec1,rec2) {
                    var idx1 = Ext.Array.indexOf(featureLayers,rec1.get('_id'));
                    var idx2 = Ext.Array.indexOf(featureLayers,rec2.get('_id'));
                    return idx2<idx1
                            
                }
        })
        var locCmp = Ext.ComponentQuery.query('performedanalysisform #location')[0];
        locCmp.setValue(locCmp.getValue());
        var flCmp = Ext.ComponentQuery.query('performedanalysisform #featureLayerTemplates')[0];
        flCmp.setValue(flCmp.getValue());
        var yearCmp = Ext.ComponentQuery.query('performedanalysisform #year')[0];
        yearCmp.setValue(yearCmp.getValue());
    },
    onAreaTemplateChanged: function(combo,val) {
        var store = Ext.StoreMgr.lookup('groupattributeset4spatialagg');
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(rec.get('featureLayers') || [],val);
        }])
    },  
     
    onSpatialTopicsChanged: function(combo,val) {
        if (!val) return;
        var attrSetStore = Ext.StoreMgr.lookup('resultattributeset4spatialagg');
        var featureLayerStore = Ext.StoreMgr.lookup('areatemplate4spatialagg');
        attrSetStore.clearFilter(true);
        featureLayerStore.clearFilter(true);
        attrSetStore.filter([function(rec) {
            var fl = rec.get('featureLayers') || [];
            return Ext.Array.contains(val,rec.get('topic')) && fl.length==0;
        }])
        featureLayerStore.filter([function(rec) {
            return Ext.Array.contains(val,rec.get('topic')) && !rec.get('justVisualization')
        }])
        var flComponent = Ext.ComponentQuery.query('spatialaggform #areaTemplate')[0];
        flComponent.setValue(flComponent.getValue())
        var attrSetComponent = Ext.ComponentQuery.query('spatialaggform #attributeSet')[0];
        attrSetComponent.setValue(attrSetComponent.getValue())
    },
        
    onFidTopicsChanged: function(combo,val) {
        if (!val) return;
        var storeName = combo.ownerCt.xtype=='fidaggform' ? 'attributeset4fidagg' : 'attributeset4math'
        var store = Ext.StoreMgr.lookup(storeName);
        store.clearFilter(true);
        store.filter([function(rec) {
            var fl = rec.get('featureLayers') || [];
            return Ext.Array.contains(val,rec.get('topic')) && fl.length==0;
        }])
    },
        
        
    onFill: function(btn) {
       var store = btn.up('grid').store;
       var first = store.getAt(0);
       store.each(function(rec) {
           rec.set('type',rec.get('type') || first.get('type'));
           rec.set('normAttributeSet',rec.get('normAttributeSet') || first.get('normAttributeSet'));
           rec.set('normAttribute',rec.get('normAttribute') || first.get('normAttribute'));
       })
       
       
    },
        
    onPerformedAnalysisReload: function() {
        Ext.StoreMgr.lookup('performedanalysis').load();
    },
    
    onAttrSetChanged: function(combo,val) {
        
        var attributeSet = Ext.StoreMgr.lookup('attributeset').getById(val);
        if (!attributeSet) return;
        var attributes = attributeSet.get('attributes');
        var recsToAdd = [];
        for (var i=0;i<attributes.length;i++) {
            var attribute = attributes[i];
            var rec = Ext.create('Puma.model.AggregationMap',{
                attribute: attribute
            })
            recsToAdd.push(rec)
        }
        Ext.StoreMgr.lookup('spatialaggmap').loadData(recsToAdd);
    },
            
            
    onGroupAttrSetChanged: function(combo,val) {
        var attributeSet = Ext.StoreMgr.lookup('attributeset').getById(val);
        if (!attributeSet) return;
        var attributes = attributeSet.get('attributes');
        var store = Ext.StoreMgr.lookup('attribute4spatialagg')
        store.clearFilter(true);
        store.filter([function(rec) {
            return Ext.Array.contains(attributes,rec.get('_id'))
        }])
    },
        
    onAttrSetsChanged: function(selector,val) {
        var attributeSets = val;
        var attrSetStore = Ext.StoreMgr.lookup('attributeset');
        var fidAggStore = Ext.StoreMgr.lookup('fidaggmap')
        var currentAttributeSets = fidAggStore.collect('attributeSet');
        var attrSetsToAdd = Ext.Array.difference(attributeSets, currentAttributeSets);
        var attrSetsToRemove = Ext.Array.difference(currentAttributeSets, attributeSets);
        var recsToAdd = [];
        var recsToRemove = [];
        for (var i = 0; i < attrSetsToAdd.length; i++) {
            var attributeSet = attrSetStore.getById(attrSetsToAdd[i]);
            var attributes = attributeSet.get('attributes');
            for (var j = 0; j < attributes.length; j++) {
                var attr = attributes[j];
                var rec = Ext.create('Puma.model.AggregationMap', {
                    attribute: attr,
                    attributeSet: attrSetsToAdd[i]
                })
                recsToAdd.push(rec);
            }
        }
        for (var i=0;i<attrSetsToRemove.length;i++) {
            var attrSet = attrSetsToRemove[i];
            var recs = fidAggStore.query('attributeSet',attrSet).getRange();
            recsToRemove = Ext.Array.merge(recs,recsToRemove);
        }
        fidAggStore.remove(recsToRemove);
        fidAggStore.add(recsToAdd);
        
    },
    
    onAnalysisTypeSelected: function(model,selection) {
        
        var objectsGrid = Ext.ComponentQuery.query('analysistab #analysisgrid')[0];
        var form = objectsGrid.nextSibling();
        var parent = objectsGrid.ownerCt;
        if (!selection.length) {
            if (form) {
                parent.remove(form)
            }
            return;
        }
        if (form) {
            parent.remove(form)
        }
        var rec = selection[0];
        var type = rec.get('type');
        parent.add({
            xtype: type+'form'
        })
        var store = Ext.StoreMgr.lookup('analysismng');
        store.clearFilter(true);
        store.filter([function(rec) {
            return rec.get('type') == type
        }])
        Ext.ComponentQuery.query(type+'form #type')[0].setValue(type);
    }
})


